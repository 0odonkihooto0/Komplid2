import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { guestScopeSchema } from '@/types/guest-scope';

export const dynamic = 'force-dynamic';

// Схема тела PATCH-запроса
const updateCommentSchema = z.object({
  content: z.string().min(1, 'Содержимое комментария не может быть пустым').max(5000),
});

export async function PATCH(
  req: Request,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const activeWorkspaceId = session.user.activeWorkspaceId;
    if (!activeWorkspaceId) return errorResponse('Нет активного workspace', 403);

    // Проверка что пользователь — гость в этом workspace
    const member = await db.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId: activeWorkspaceId },
    });
    if (!member || member.role !== 'GUEST') return errorResponse('Нет доступа', 403);

    // Разбираем scope (не используем разрешения для редактирования — только автор может)
    guestScopeSchema.parse(member.guestScope);

    // Загружаем комментарий с проверкой принадлежности к workspace
    const comment = await db.guestComment.findFirst({
      where: {
        id: params.commentId,
        workspaceId: activeWorkspaceId,
      },
    });

    if (!comment) return errorResponse('Комментарий не найден', 404);

    // Только автор может редактировать свой комментарий
    if (comment.authorUserId !== session.user.id) {
      return errorResponse('Нет доступа к редактированию этого комментария', 403);
    }

    // Редактирование разрешено только для открытых комментариев
    if (comment.status !== 'OPEN') {
      return errorResponse('Редактирование закрытого комментария запрещено', 400);
    }

    // Валидация тела запроса
    const body = await req.json() as unknown;
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    // Обновляем содержимое комментария
    const updated = await db.guestComment.update({
      where: { id: params.commentId },
      data: { content: parsed.data.content },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления комментария гостя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
