import { WorkspaceRole } from '@prisma/client';
import { errorResponse } from '@/utils/api';
import { PERMISSION_MATRIX } from './matrix';
import { ACTIONS } from './actions';
import type { Action } from './actions';
import type { GuestScope, PermissionContext } from './types';

/**
 * Проверяет, разрешено ли действие для данной роли.
 * Чистая функция — без обращений к БД.
 *
 * @param role   - WorkspaceRole участника
 * @param action - проверяемое действие из ACTIONS
 * @param context - опциональный контекст (guestScope, memberOwnsResource)
 */
export function hasPermission(
  role: WorkspaceRole,
  action: Action,
  context?: PermissionContext
): boolean {
  // Для GUEST: DOCUMENT_SIGN и DOCUMENT_VIEW_COSTS определяются через guestScope,
  // а не через матрицу. Проверяем контекст ДО матрицы чтобы они работали.
  if (role === WorkspaceRole.GUEST && context?.guestScope) {
    if (action === ACTIONS.DOCUMENT_SIGN) {
      return context.guestScope.permissions?.canSignActs === true;
    }
    if (action === ACTIONS.DOCUMENT_VIEW_COSTS) {
      return context.guestScope.permissions?.canViewCosts === true;
    }
  }

  return PERMISSION_MATRIX[role]?.includes(action) ?? false;
}

/**
 * Асинхронная проверка прав через БД.
 * Загружает WorkspaceMember, проверяет статус и вызывает hasPermission.
 * Бросает errorResponse(403) если доступ запрещён.
 *
 * db импортируется лениво чтобы не тянуть env-валидацию в unit-тесты.
 *
 * @returns WorkspaceMember если доступ разрешён
 */
export async function requirePermission(
  userId: string,
  workspaceId: string,
  action: Action,
  context?: Omit<PermissionContext, 'guestScope'>
) {
  const { db } = await import('@/lib/db');

  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!member || member.status !== 'ACTIVE') {
    throw errorResponse('Нет доступа к рабочему пространству', 403);
  }

  const ctx: PermissionContext = {
    guestScope: member.guestScope as GuestScope | undefined,
    ...context,
  };

  if (!hasPermission(member.role, action, ctx)) {
    throw errorResponse(
      `Действие запрещено для роли ${member.role}`,
      403
    );
  }

  return member;
}

/**
 * Проверяет системную роль ADMIN (User.role, не WorkspaceRole).
 * Используется для эндпоинтов /api/admin/*, доступных только суперадминам.
 * Бросает errorResponse(403) если пользователь не системный ADMIN.
 */
export function requireSystemAdmin(session: { user: { role: string } }): void {
  if (session.user.role !== 'ADMIN') {
    throw errorResponse('Недостаточно прав', 403);
  }
}

/**
 * Возвращает true если пользователь — системный ADMIN.
 * Использовать для условных веток (canDelete и т.п.), а не для блокирующих проверок.
 */
export function isSystemAdmin(session: { user: { role: string } }): boolean {
  return session.user.role === 'ADMIN';
}
