import type { ProfessionalRole } from '@prisma/client';

// Маппинг профессиональной роли → видимые модули (первый сегмент href модуля)
export const ROLE_VISIBLE_MODULES: Record<ProfessionalRole, string[]> = {
  SMETCHIK:        ['info', 'project-management', 'estimates', 'reports'],
  PTO:             ['info', 'project-management', 'journals', 'id', 'sk', 'reports'],
  FOREMAN:         ['info', 'journals', 'sk', 'resources', 'reports'],
  SK_INSPECTOR:    ['info', 'sk', 'journals', 'reports'],
  SUPPLIER:        ['info', 'resources', 'project-management', 'reports'],
  PROJECT_MANAGER: ['info', 'project-management', 'pir', 'estimates', 'gpr',
                    'resources', 'reports', 'sk', 'id', 'tim'],
  ACCOUNTANT:      ['info', 'project-management', 'id', 'reports'],
};

export function isModuleVisibleForRole(
  moduleHref: string,
  role: ProfessionalRole | null | undefined,
  workspaceType: string | null | undefined
): boolean {
  // COMPANY workspace — всё видно, роль не ограничивает
  if (workspaceType !== 'PERSONAL') return true;
  // Без роли — всё видно (чтобы не сломать UX при отсутствии данных)
  if (!role) return true;
  // Берём первый сегмент href как ключ модуля
  const key = moduleHref.split('/')[0];
  return ROLE_VISIBLE_MODULES[role]?.includes(key) ?? false;
}
