import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requirePermission } from '@/lib/permissions/check';
import { ACTIONS } from '@/lib/permissions/actions';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Отменить приглашение */
export async function DELETE(
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

    if (invitation.status !== 'PENDING') {
      return errorResponse('Можно отменить только активное приглашение', 409);
    }

    await db.workspaceInvitation.update({
      where: { id: params.invId },
      data: { status: 'CANCELLED' },
    });

    logger.info({ invId: params.invId, wsId: params.wsId }, 'Приглашение отменено');
    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка отмены приглашения workspace');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
