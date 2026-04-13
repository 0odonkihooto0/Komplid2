import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { updateRequestCommentSchema } from '@/lib/validations/request-comment';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; rid: string; commentId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const comment = await db.materialRequestComment.findFirst({
      where: { id: params.commentId, requestId: params.rid },
    });
    if (!comment) return errorResponse('Комментарий не найден', 404);

    // Редактировать может только автор
    if (comment.authorId !== session.user.id) {
      return errorResponse('Редактировать комментарий может только автор', 403);
    }

    const body = await req.json();
    const parsed = updateRequestCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.materialRequestComment.update({
      where: { id: params.commentId },
      data: { text: parsed.data.text },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления комментария к заявке');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; rid: string; commentId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const comment = await db.materialRequestComment.findFirst({
      where: { id: params.commentId, requestId: params.rid },
    });
    if (!comment) return errorResponse('Комментарий не найден', 404);

    // Удалять может только автор
    if (comment.authorId !== session.user.id) {
      return errorResponse('Удалить комментарий может только автор', 403);
    }

    // onDelete: Cascade в схеме удалит вложенные ответы автоматически
    await db.materialRequestComment.delete({ where: { id: params.commentId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления комментария к заявке');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
