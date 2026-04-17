import { TaskGroupVisibility } from '@prisma/client';

type TaskForVisibility = {
  createdById: string;
  roles: { userId: string }[];
  group: { visibility: TaskGroupVisibility; visibleUserIds: string[] } | null;
};

/**
 * Задача видна пользователю если он создал её, имеет роль,
 * или задача в группе с соответствующей видимостью.
 */
export function canUserSeeTask(userId: string, task: TaskForVisibility): boolean {
  if (task.createdById === userId) return true;
  if (task.roles.some((r) => r.userId === userId)) return true;
  if (task.group?.visibility === 'EVERYONE') return true;
  if (task.group?.visibleUserIds.includes(userId)) return true;
  return false;
}

/**
 * Prisma WHERE clause для фильтрации задач по правилам видимости.
 * Multi-tenancy: Task → project → organizationId.
 */
export function buildTaskVisibilityWhere(userId: string, orgId: string) {
  return {
    project: { organizationId: orgId },
    OR: [
      { createdById: userId },
      { roles: { some: { userId } } },
      { group: { visibility: TaskGroupVisibility.EVERYONE } },
      { group: { visibleUserIds: { has: userId } } },
    ],
  };
}
