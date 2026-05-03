import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Роли с правом отзыва приглашений
const REVOKE_ROLES = ['OWNER', 'ADMIN'] as const;

// DELETE — отозвать гостевое приглашение
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { wsId: string; invId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const { wsId, invId } = params;

    // Проверить что пользователь член workspace с правом отзывать приглашения
    const membership = await db.workspaceMember.findFirst({
      where: {
        workspaceId: wsId,
        userId: session.user.id,
        role: { in: [...REVOKE_ROLES] },
      },
    });

    if (!membership) {
      return errorResponse('Недостаточно прав для отзыва приглашения', 403);
    }

    // Найти приглашение с проверкой принадлежности воркспейсу (multi-tenancy)
    const invitation = await db.guestInvitation.findFirst({
      where: { id: invId, workspaceId: wsId },
    });

    if (!invitation) {
      return errorResponse('Приглашение не найдено', 404);
    }

    // Нельзя отзывать уже обработанное приглашение
    if (invitation.status !== 'PENDING') {
      return errorResponse('Приглашение уже обработано', 400);
    }

    // Отозвать приглашение
    await db.guestInvitation.update({
      where: { id: invId },
      data: { status: 'REVOKED' },
    });

    return successResponse({ id: invId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка отзыва гостевого приглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
