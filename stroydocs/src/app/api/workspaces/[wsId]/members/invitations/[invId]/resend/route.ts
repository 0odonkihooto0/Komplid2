import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requirePermission } from '@/lib/permissions/check';
import { ACTIONS } from '@/lib/permissions/actions';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Повторно отправить приглашение: обновить токен и срок действия */
export async function POST(
  _req: NextRequest,
  { params }: { params: { wsId: string; invId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    await requirePermission(session.user.id, params.wsId, ACTIONS.WORKSPACE_MANAGE_MEMBERS);

    const invitation = await db.workspaceInvitation.findFirst({
      where: { id: params.invId, workspaceId: params.wsId },
    });
    if (!invitation) return errorResponse('Приглашение не найдено', 404);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Генерируем новый токен (UUID) и продлеваем срок
    const token = randomUUID();

    const updated = await db.workspaceInvitation.update({
      where: { id: params.invId },
      data: { token, expiresAt, status: 'PENDING' },
    });

    const inviteUrl = `${process.env.APP_URL ?? ''}/workspace/join?token=${token}`;

    logger.info({ invId: params.invId, wsId: params.wsId }, 'Приглашение повторно отправлено');
    return successResponse({ invitation: updated, inviteUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка повторной отправки приглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
