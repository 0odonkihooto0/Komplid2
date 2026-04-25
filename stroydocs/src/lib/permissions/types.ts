/**
 * Типы для системы permissions.
 * Используются в hasPermission, requirePermission и WorkspaceMember.guestScope.
 */

export interface GuestScope {
  /** ID проектов, которые гость может видеть. Пусто = нет доступа */
  projectIds?: string[];
  permissions?: {
    /** Может ли подписывать акты */
    canSignActs?: boolean;
    /** Может ли видеть стоимости */
    canViewCosts?: boolean;
    /** Может ли видеть приватные фото */
    canViewPhotos?: boolean;
    /** Может ли создавать комментарии */
    canCreateComments?: boolean;
  };
}

export interface PermissionContext {
  /** Scope для роли GUEST — ограничения доступа внутри проектов */
  guestScope?: GuestScope;
  /** Является ли текущий пользователь владельцем ресурса */
  memberOwnsResource?: boolean;
}
