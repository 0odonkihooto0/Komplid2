import type { GanttTask } from '@prisma/client';

export interface VersionDiff {
  added: GanttTask[];
  removed: GanttTask[];
  changed: Array<{
    v1Task: GanttTask;
    v2Task: GanttTask;
    changes: {
      planStart?: { from: Date; to: Date };
      planEnd?: { from: Date; to: Date };
      amount?: { from: number | null; to: number | null };
    };
  }>;
  unchanged: GanttTask[];
}

/**
 * Сравнивает два набора задач ГПР (из разных версий).
 * Сопоставление — по точному совпадению имени задачи (MVP).
 * Возвращает добавленные, удалённые, изменённые и неизменённые задачи.
 */
export function compareVersions(v1Tasks: GanttTask[], v2Tasks: GanttTask[]): VersionDiff {
  const added: GanttTask[] = [];
  const removed: GanttTask[] = [];
  const changed: VersionDiff['changed'] = [];
  const unchanged: GanttTask[] = [];

  // Создаём Map по имени для сопоставления (MVP — точное совпадение по name)
  const v2ByName = new Map<string, GanttTask>();
  for (const task of v2Tasks) {
    v2ByName.set(task.name, task);
  }

  const matchedV2Names = new Set<string>();

  for (const v1Task of v1Tasks) {
    const v2Task = v2ByName.get(v1Task.name);
    if (!v2Task) {
      removed.push(v1Task);
      continue;
    }

    matchedV2Names.add(v1Task.name);

    // Проверяем отличия в ключевых полях
    const changes: VersionDiff['changed'][0]['changes'] = {};

    if (v1Task.planStart.getTime() !== v2Task.planStart.getTime()) {
      changes.planStart = { from: v1Task.planStart, to: v2Task.planStart };
    }
    if (v1Task.planEnd.getTime() !== v2Task.planEnd.getTime()) {
      changes.planEnd = { from: v1Task.planEnd, to: v2Task.planEnd };
    }
    if (v1Task.amount !== v2Task.amount) {
      changes.amount = { from: v1Task.amount, to: v2Task.amount };
    }

    if (Object.keys(changes).length > 0) {
      changed.push({ v1Task, v2Task, changes });
    } else {
      unchanged.push(v1Task);
    }
  }

  // Задачи в v2 которых нет в v1 — добавленные
  for (const v2Task of v2Tasks) {
    if (!matchedV2Names.has(v2Task.name)) {
      added.push(v2Task);
    }
  }

  return { added, removed, changed, unchanged };
}
