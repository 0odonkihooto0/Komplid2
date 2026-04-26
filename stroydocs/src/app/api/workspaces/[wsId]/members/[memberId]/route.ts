import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requirePermission } from '@/lib/permissions/check';
import { ACTIONS } from '@/lib/permissions/actions';
import { updateMemberSchema } from '@/lib/validations/workspace-member';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Обновить роль/статус/специализацию члена workspace */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { wsId: string; memberId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    await requirePermission(session.user.id, params.wsId, ACTIONS.WORKSPACE_MANAGE_MEMBERS);

    // Находим обновляемого члена
    const target = await db.workspaceMember.findFirst({
      where: { id: params.memberId, workspaceId: params.wsId },
    });
    if (!target) return errorResponse('Член команды не найден', 404);

    const body = await req.json();
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { role, specialization, title, status, deactivationReason, transferOwnershipTo } =
      parsed.data;

    // Нельзя изменять собственную запись через этот эндпоинт
    if (target.userId === session.user.id) {
      return errorResponse('Нельзя изменять собственную запись', 403);
    }

    // Если снимается OWNER — нужна передача прав
    const isRemovingOwner =
      target.role === 'OWNER' &&
      (status === 'DEACTIVATED' || status === 'SUSPENDED' || role !== undefined);

    if (isRemovingOwner && !transferOwnershipTo) {
      const ownerCount = await db.workspaceMember.count({
        where: { workspaceId: params.wsId, role: 'OWNER', status: 'ACTIVE' },
      });
      if (ownerCount <= 1) {
        return errorResponse(
          'Нельзя деактивировать единственного владельца без передачи прав',
          409
        );
      }
    }

    // Передача владельца — атомарная транзакция
    if (transferOwnershipTo) {
      const newOwnerMember = await db.workspaceMember.findFirst({
        where: { id: transferOwnershipTo, workspaceId: params.wsId, status: 'ACTIVE' },
      });
      if (!newOwnerMember) {
        return errorResponse('Новый владелец не найден в workspace', 404);
      }

      const [updated] = await db.$transaction([
        db.workspaceMember.update({
          where: { id: params.memberId },
          data: {
            status: status ?? 'DEACTIVATED',
            ...(deactivationReason ? { deactivationReason } : {}),
            deactivatedAt: new Date(),
          },
        }),
        db.workspaceMember.update({
          where: { id: newOwnerMember.id },
          data: { role: 'OWNER' },
        }),
      ]);
      return successResponse(updated);
    }

    // Обычное обновление
    const updated = await db.workspaceMember.update({
      where: { id: params.memberId },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(specialization !== undefined ? { specialization } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(status !== undefined
          ? {
              status,
              ...(status === 'DEACTIVATED' || status === 'SUSPENDED'
                ? { deactivatedAt: new Date(), deactivationReason: deactivationReason ?? null }
                : { deactivatedAt: null, deactivationReason: null }),
            }
          : {}),
      },
    });

    logger.info(
      { memberId: params.memberId, wsId: params.wsId, actorId: session.user.id },
      'Данные члена workspace обновлены'
    );
    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления члена workspace');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
