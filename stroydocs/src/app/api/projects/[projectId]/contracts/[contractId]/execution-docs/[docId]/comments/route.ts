import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createDocCommentSchema } from '@/lib/validations/doc-comment';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const comments = await db.docComment.findMany({
      where: { executionDocId: params.docId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        responsible: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(comments);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения замечаний');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверка существования документа
    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = createDocCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Авто-нумерация замечания в рамках документа
    const existingCount = await db.docComment.count({
      where: { executionDocId: params.docId },
    });

    const { plannedResolveDate, ...restData } = parsed.data;

    const comment = await db.docComment.create({
      data: {
        ...restData,
        plannedResolveDate: plannedResolveDate ? new Date(plannedResolveDate) : undefined,
        commentNumber: existingCount + 1,
        executionDocId: params.docId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        responsible: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { replies: true } },
      },
    });

    // При наличии согласования — приостановить маршрут если документ на согласовании
    if (doc.status === 'IN_REVIEW') {
      await db.approvalRoute.updateMany({
        where: { executionDocId: params.docId, status: 'PENDING' },
        data: { status: 'PENDING_REMARKS' },
      });
    }

    return successResponse(comment);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания замечания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
