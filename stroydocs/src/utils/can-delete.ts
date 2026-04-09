import type { UserRole } from '@prisma/client';

/**
 * Проверяет, может ли текущий пользователь удалить объект.
 * ADMIN может удалять всё, остальные — только свои записи.
 */
export function canDelete(
  currentUserId: string,
  currentUserRole: UserRole,
  createdById: string | null | undefined
): boolean {
  if (currentUserRole === 'ADMIN') return true;
  return createdById === currentUserId;
}
