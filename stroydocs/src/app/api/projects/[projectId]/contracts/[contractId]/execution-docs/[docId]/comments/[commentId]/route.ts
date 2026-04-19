import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { updateDocCommentStatusSchema } from '@/lib/validations/doc-comment';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string; commentId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = updateDocCommentStatusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const comment = await db.docComment.findFirst({
      where: { id: params.commentId, executionDocId: params.docId },
    });
    if (!comment) return errorResponse('Замечание не найдено', 404);

    const { status, suggestion, responsibleId, plannedResolveDate, actualResolveDate } =
      parsed.data;

    const updated = await db.docComment.update({
      where: { id: params.commentId },
      data: {
        status,
        suggestion: suggestion !== undefined ? suggestion : undefined,
        responsibleId: responsibleId !== undefined ? responsibleId : undefined,
        plannedResolveDate:
          plannedResolveDate !== undefined
            ? plannedResolveDate
              ? new Date(plannedResolveDate)
              : null
            : undefined,
        actualResolveDate:
          actualResolveDate !== undefined
            ? actualResolveDate
              ? new Date(actualResolveDate)
              : null
            : undefined,
        ...(status === 'RESOLVED' && {
          resolvedById: session.user.id,
          resolvedAt: new Date(),
        }),
        ...(status === 'OPEN' && {
          resolvedById: null,
          resolvedAt: null,
        }),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        responsible: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { replies: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления замечания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string; commentId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const comment = await db.docComment.findFirst({
      where: { id: params.commentId, executionDocId: params.docId },
    });
    if (!comment) return errorResponse('Замечание не найдено', 404);

    // Удалять может только автор
    if (comment.authorId !== session.user.id) {
      return errorResponse('Удалить замечание может только автор', 403);
    }

    await db.docComment.delete({ where: { id: params.commentId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления замечания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
