import type { PrismaTx } from '@/lib/db';

interface TaskForRecalc {
  id: string;
  parentId: string | null;
  planStart: Date;
  planEnd: Date;
  factStart: Date | null;
  factEnd: Date | null;
  progress: number;
  weight: number;
  amount: number | null;
}

/**
 * Пересчёт суммарных (родительских) задач версии ГПР.
 * Обходит дерево снизу вверх и агрегирует: planStart, planEnd, factStart, factEnd, progress, amount.
 */
export async function recalcSummaryTasks(
  tx: PrismaTx,
  versionId: string
): Promise<void> {
  const tasks = await tx.ganttTask.findMany({
    where: { versionId },
    select: {
      id: true,
      parentId: true,
      planStart: true,
      planEnd: true,
      factStart: true,
      factEnd: true,
      progress: true,
      weight: true,
      amount: true,
    },
  });

  if (tasks.length === 0) return;

  // Построить карту children по parentId
  const childrenMap = new Map<string, TaskForRecalc[]>();
  const taskMap = new Map<string, TaskForRecalc>();

  for (const t of tasks) {
    taskMap.set(t.id, t);
    if (t.parentId) {
      if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
      childrenMap.get(t.parentId)!.push(t);
    }
  }

  // Определить родительские задачи (те, у кого есть дочерние)
  const parentIds = Array.from(childrenMap.keys());
  if (parentIds.length === 0) return;

  // Топологическая сортировка снизу вверх: обрабатываем самые глубокие узлы первыми
  // Вычисляем глубину каждого узла и сортируем по убыванию
  const depthMap = new Map<string, number>();
  function getDepth(id: string): number {
    if (depthMap.has(id)) return depthMap.get(id)!;
    const task = taskMap.get(id);
    if (!task || !task.parentId) {
      depthMap.set(id, 0);
      return 0;
    }
    const d = getDepth(task.parentId) + 1;
    depthMap.set(id, d);
    return d;
  }
  for (const id of parentIds) getDepth(id);

  // Сортировка: сначала самые глубокие родители
  const sortedParentIds = [...parentIds].sort(
    (a, b) => (depthMap.get(b) ?? 0) - (depthMap.get(a) ?? 0)
  );

  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];

  for (const pid of sortedParentIds) {
    const parent = taskMap.get(pid);
    if (!parent) continue;

    const children = childrenMap.get(pid) ?? [];
    if (children.length === 0) continue;

    const newPlanStart = new Date(
      Math.min(...children.map((c) => c.planStart.getTime()))
    );
    const newPlanEnd = new Date(
      Math.max(...children.map((c) => c.planEnd.getTime()))
    );

    // factStart = min(children factStart) где не null
    const factStarts = children
      .map((c) => c.factStart)
      .filter((d): d is Date => d !== null);
    const newFactStart =
      factStarts.length > 0
        ? new Date(Math.min(...factStarts.map((d) => d.getTime())))
        : null;

    // factEnd = max(children factEnd) только если ВСЕ дочерние имеют factEnd
    const allHaveFactEnd = children.every((c) => c.factEnd !== null);
    const newFactEnd = allHaveFactEnd
      ? new Date(
          Math.max(
            ...children.map((c) => c.factEnd!.getTime())
          )
        )
      : null;

    // progress: взвешенное среднее по weight, или простое среднее если все weight = 0
    const totalWeight = children.reduce((sum, c) => sum + c.weight, 0);
    const newProgress =
      totalWeight > 0
        ? children.reduce((sum, c) => sum + c.progress * c.weight, 0) /
          totalWeight
        : children.reduce((sum, c) => sum + c.progress, 0) / children.length;

    // amount: сумма
    const amounts = children
      .map((c) => c.amount)
      .filter((a): a is number => a !== null);
    const newAmount = amounts.length > 0 ? amounts.reduce((s, a) => s + a, 0) : null;

    const data: Record<string, unknown> = {};
    if (parent.planStart.getTime() !== newPlanStart.getTime())
      data.planStart = newPlanStart;
    if (parent.planEnd.getTime() !== newPlanEnd.getTime())
      data.planEnd = newPlanEnd;
    if (
      (parent.factStart?.getTime() ?? null) !==
      (newFactStart?.getTime() ?? null)
    )
      data.factStart = newFactStart;
    if (
      (parent.factEnd?.getTime() ?? null) !==
      (newFactEnd?.getTime() ?? null)
    )
      data.factEnd = newFactEnd;
    if (Math.abs(parent.progress - newProgress) > 0.01)
      data.progress = Math.round(newProgress * 100) / 100;
    if ((parent.amount ?? null) !== newAmount) data.amount = newAmount;

    if (Object.keys(data).length > 0) {
      updates.push({ id: pid, data });
      // Обновить taskMap для правильного каскадного пересчёта
      const updated = { ...parent, ...data } as TaskForRecalc;
      taskMap.set(pid, updated);
      // Обновить в childrenMap родителя (если есть)
      if (parent.parentId && childrenMap.has(parent.parentId)) {
        const siblings = childrenMap.get(parent.parentId)!;
        const idx = siblings.findIndex((s) => s.id === pid);
        if (idx !== -1) siblings[idx] = updated;
      }
    }
  }

  await Promise.all(updates.map(({ id, data }) => tx.ganttTask.update({ where: { id }, data })));
}
