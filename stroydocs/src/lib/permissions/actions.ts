/**
 * Реестр всех действий в системе.
 * Используется в PERMISSION_MATRIX и requirePermission().
 *
 * Формат: <domain>.<verb>
 * Запрещено: проверять действия сырыми строками вне src/lib/permissions/
 */
export const ACTIONS = {
  // Workspace
  WORKSPACE_MANAGE_MEMBERS: 'workspace.manage_members',
  WORKSPACE_MANAGE_BILLING: 'workspace.manage_billing',
  WORKSPACE_DELETE: 'workspace.delete',
  WORKSPACE_EDIT_PROFILE: 'workspace.edit_profile',
  WORKSPACE_INVITE_GUEST: 'workspace.invite_guest',
  WORKSPACE_VIEW_AUDIT_LOG: 'workspace.view_audit_log',

  // Projects
  PROJECT_CREATE: 'project.create',
  PROJECT_VIEW: 'project.view',
  PROJECT_EDIT: 'project.edit',
  PROJECT_DELETE: 'project.delete',
  PROJECT_PUBLISH_DASHBOARD: 'project.publish_dashboard',
  PROJECT_MANAGE_MEMBERS: 'project.manage_members',

  // Documents
  DOCUMENT_CREATE: 'document.create',
  DOCUMENT_EDIT: 'document.edit',
  DOCUMENT_DELETE: 'document.delete',
  DOCUMENT_SIGN: 'document.sign',
  DOCUMENT_VIEW_COSTS: 'document.view_costs',

  // Estimates
  ESTIMATE_CREATE: 'estimate.create',
  ESTIMATE_EDIT: 'estimate.edit',
  ESTIMATE_VIEW_PRICES: 'estimate.view_prices',

  // Photos
  PHOTO_UPLOAD: 'photo.upload',
  PHOTO_DELETE: 'photo.delete',
  PHOTO_VIEW_PRIVATE: 'photo.view_private',

  // Comments
  COMMENT_CREATE: 'comment.create',
  COMMENT_RESOLVE: 'comment.resolve',

  // Marketplace (резерв для KF-4)
  MARKETPLACE_CREATE_LISTING: 'marketplace.create_listing',
  MARKETPLACE_RESPOND: 'marketplace.respond',
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];
