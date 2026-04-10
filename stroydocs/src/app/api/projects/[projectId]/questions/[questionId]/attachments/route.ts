import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { addQuestionAttachmentSchema } from '@/lib/validations/question';
import { generateUploadUrl, buildS3Key } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; questionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const issue = await db.problemIssue.findFirst({
      where: { id: params.questionId, projectId: params.projectId },
      select: { id: true },
    });
    if (!issue) return errorResponse('Вопрос не найден', 404);

    const body = await req.json();
    const parsed = addQuestionAttachmentSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { fileName, mimeType, size } = parsed.data;

    const s3Key    = buildS3Key(session.user.organizationId, 'question', fileName);
    const uploadUrl = await generateUploadUrl(s3Key, mimeType);

    const attachment = await db.problemIssueAttachment.create({
      data: { issueId: params.questionId, fileName, s3Key, mimeType, size },
    });

    return successResponse({ attachment, uploadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления вложения к проблемному вопросу');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Получить presigned URL для скачивания вложения */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; questionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const attachmentId = req.nextUrl.searchParams.get('attachmentId');
    if (!attachmentId) return errorResponse('Не указан attachmentId', 400);

    const attachment = await db.problemIssueAttachment.findFirst({
      where: { id: attachmentId, issueId: params.questionId },
    });
    if (!attachment) return errorResponse('Вложение не найдено', 404);

    const { getDownloadUrl } = await import('@/lib/s3-utils');
    const url = await getDownloadUrl(attachment.s3Key);
    return successResponse({ url, fileName: attachment.fileName });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения URL вложения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
