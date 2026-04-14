import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createDocCommentReplySchema } from '@/lib/validations/doc-comment';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; docId: string; commentId: string } };

/** GET — список ответов на замечание */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const comment = await db.docComment.findFirst({
      where: { id: params.commentId, executionDocId: params.docId },
    });
    if (!comment) return errorResponse('Замечание не найдено', 404);

    const replies = await db.docCommentReply.findMany({
      where: { commentId: params.commentId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(replies);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения ответов на замечание');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — добавить ответ на замечание */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const comment = await db.docComment.findFirst({
      where: { id: params.commentId, executionDocId: params.docId },
    });
    if (!comment) return errorResponse('Замечание не найдено', 404);

    const body = await req.json();
    const parsed = createDocCommentReplySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const reply = await db.docCommentReply.create({
      data: {
        ...parsed.data,
        commentId: params.commentId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(reply);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления ответа на замечание');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
