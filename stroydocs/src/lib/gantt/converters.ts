import type { Task } from 'gantt-task-react';

interface GanttTaskLike {
  id: string;
  name: string;
  planStart: Date | string;
  planEnd: Date | string;
  progress: number;
  isCritical: boolean;
  parentId: string | null;
  sortOrder: number;
}

/**
 * Конвертирует массив задач в Task[] для gantt-task-react.
 * Задачи с дочерними → тип 'project' (раздел); листья → тип 'task'.
 */
export function convertToGanttLibTasks(tasks: GanttTaskLike[]): Task[] {
  const childIds = new Set(tasks.filter((t) => t.parentId).map((t) => t.parentId!));

  return tasks.map((t): Task => {
    const isParent = childIds.has(t.id);
    const isDone = t.progress >= 100;

    let bgColor = '#2563EB'; // синий — план
    if (t.isCritical) bgColor = '#ef4444'; // красный — критический путь
    if (isDone) bgColor = '#22c55e'; // зелёный — завершено

    return {
      id: t.id,
      name: t.name,
      start: t.planStart instanceof Date ? t.planStart : new Date(t.planStart),
      end: t.planEnd instanceof Date ? t.planEnd : new Date(t.planEnd),
      progress: t.progress,
      type: isParent ? 'project' : 'task',
      hideChildren: false,
      displayOrder: t.sortOrder,
      // Родительская задача
      project: t.parentId ?? undefined,
      styles: {
        backgroundColor: bgColor,
        backgroundSelectedColor: bgColor,
        progressColor: isDone ? '#16a34a' : '#1d4ed8',
        progressSelectedColor: isDone ? '#16a34a' : '#1d4ed8',
      },
    };
  });
}

/**
 * Рассчитывает плановый прогресс на указанную дату (для S-кривой).
 * Возвращает % задач, у которых planEnd <= date.
 */
export function calculatePlannedProgress(tasks: GanttTaskLike[], date: Date): number {
  const leaves = tasks.filter((t) => !tasks.some((o) => o.parentId === t.id));
  if (leaves.length === 0) return 0;
  const done = leaves.filter((t) => {
    const end = t.planEnd instanceof Date ? t.planEnd : new Date(t.planEnd);
    return end <= date;
  }).length;
  return Math.round((done / leaves.length) * 100);
}

/**
 * Рассчитывает фактический прогресс на указанную дату (для S-кривой).
 * Среднеарифметическое значение progress у листьев, у которых planStart <= date.
 */
export function calculateActualProgress(tasks: GanttTaskLike[], date: Date): number {
  const leaves = tasks.filter((t) => !tasks.some((o) => o.parentId === t.id));
  const started = leaves.filter((t) => {
    const start = t.planStart instanceof Date ? t.planStart : new Date(t.planStart);
    return start <= date;
  });
  if (started.length === 0) return 0;
  const sum = started.reduce((acc, t) => acc + t.progress, 0);
  return Math.round(sum / leaves.length);
}

/** Форматирует длительность в человекочитаемый вид */
export function formatDuration(start: Date, end: Date): string {
  const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 7) return `${days} д.`;
  const weeks = Math.floor(days / 7);
  const rem = days % 7;
  return rem > 0 ? `${weeks} нед. ${rem} д.` : `${weeks} нед.`;
}
