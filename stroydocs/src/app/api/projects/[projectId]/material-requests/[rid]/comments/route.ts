import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createRequestCommentSchema } from '@/lib/validations/request-comment';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; rid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
    });
    if (!request) return errorResponse('Заявка не найдена', 404);

    // Возвращаем только верхнеуровневые комментарии с вложенными ответами
    const comments = await db.materialRequestComment.findMany({
      where: { requestId: params.rid, parentId: null },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        replies: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(comments);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения комментариев к заявке');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; rid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
    });
    if (!request) return errorResponse('Заявка не найдена', 404);

    const body = await req.json();
    const parsed = createRequestCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверка существования родительского комментария
    if (parsed.data.parentId) {
      const parent = await db.materialRequestComment.findFirst({
        where: { id: parsed.data.parentId, requestId: params.rid },
      });
      if (!parent) return errorResponse('Родительский комментарий не найден', 404);
    }

    const comment = await db.materialRequestComment.create({
      data: {
        text: parsed.data.text,
        parentId: parsed.data.parentId ?? null,
        requestId: params.rid,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(comment);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания комментария к заявке');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
