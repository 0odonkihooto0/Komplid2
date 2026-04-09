import type { GanttTask, GanttDependency, GanttDependencyType } from '@prisma/client';

interface Edge {
  from: string; // predecessorId
  to: string; // successorId
  type: GanttDependencyType;
  lagDays: number;
}

/**
 * Алгоритм CPM (Critical Path Method).
 * Работает только с leaf-задачами (без детей).
 * Использует Forward Pass + Backward Pass для вычисления slack.
 * Задачи со slack = 0 попадают на критический путь.
 *
 * @returns массив id задач на критическом пути
 */
export function calculateCriticalPath(
  tasks: GanttTask[],
  dependencies: GanttDependency[],
): string[] {
  // Оставляем только leaf-задачи (не имеющие детей в выборке)
  const childIds = new Set(tasks.filter((t) => t.parentId).map((t) => t.parentId!));
  const leafTasks = tasks.filter((t) => !childIds.has(t.id));

  if (leafTasks.length === 0) return [];

  const leafSet = new Set(leafTasks.map((t) => t.id));

  // Ограничиваем зависимости только leaf-задачами
  const edges: Edge[] = dependencies
    .filter((d) => leafSet.has(d.predecessorId) && leafSet.has(d.successorId))
    .map((d) => ({
      from: d.predecessorId,
      to: d.successorId,
      type: d.type,
      lagDays: d.lagDays,
    }));

  // ES/EF/LS/LF в миллисекундах
  const es = new Map<string, number>(); // Early Start
  const ef = new Map<string, number>(); // Early Finish
  const ls = new Map<string, number>(); // Late Start
  const lf = new Map<string, number>(); // Late Finish

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Инициализация: ES = planStart, EF = planEnd
  for (const t of leafTasks) {
    es.set(t.id, t.planStart.getTime());
    ef.set(t.id, t.planEnd.getTime());
  }

  // Топологическая сортировка (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adj = new Map<string, Edge[]>();
  for (const t of leafTasks) {
    inDegree.set(t.id, 0);
    adj.set(t.id, []);
  }
  for (const e of edges) {
    adj.get(e.from)!.push(e);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const t of leafTasks) {
    if (inDegree.get(t.id) === 0) queue.push(t.id);
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    topoOrder.push(cur);
    for (const e of adj.get(cur) ?? []) {
      const deg = (inDegree.get(e.to) ?? 1) - 1;
      inDegree.set(e.to, deg);
      if (deg === 0) queue.push(e.to);
    }
  }

  // Если граф содержит цикл — возвращаем пустой массив (защита)
  if (topoOrder.length !== leafTasks.length) return [];

  // Forward Pass: обновляем ES/EF по зависимостям
  for (const id of topoOrder) {
    for (const e of adj.get(id) ?? []) {
      const lag = e.lagDays * MS_PER_DAY;
      const curEF = ef.get(id)!;
      const curES = es.get(id)!;

      let newES: number;
      switch (e.type) {
        case 'FS':
          newES = curEF + lag;
          break;
        case 'SS':
          newES = curES + lag;
          break;
        case 'FF': {
          // Новый EF преемника = EF предшественника + lag
          const dur = ef.get(e.to)! - es.get(e.to)!;
          newES = curEF + lag - dur;
          break;
        }
        case 'SF': {
          // Новый EF преемника = ES предшественника + lag
          const dur = ef.get(e.to)! - es.get(e.to)!;
          newES = curES + lag - dur;
          break;
        }
        default:
          newES = curEF + lag;
      }

      if (newES > (es.get(e.to) ?? -Infinity)) {
        const dur = ef.get(e.to)! - es.get(e.to)!;
        es.set(e.to, newES);
        ef.set(e.to, newES + dur);
      }
    }
  }

  // Вычисляем проектный deadline = max EF среди всех leaf-задач
  let projectEnd = -Infinity;
  for (const t of leafTasks) {
    const efVal = ef.get(t.id)!;
    if (efVal > projectEnd) projectEnd = efVal;
  }

  // Инициализируем LS/LF = ES/EF для задач без преемников
  for (const t of leafTasks) {
    lf.set(t.id, ef.get(t.id)!);
    ls.set(t.id, es.get(t.id)!);
  }

  // Строим обратный граф для Backward Pass
  const revAdj = new Map<string, Edge[]>();
  for (const t of leafTasks) revAdj.set(t.id, []);
  for (const e of edges) {
    revAdj.get(e.to)!.push({ ...e, from: e.to, to: e.from });
  }

  // Задачи без преемников — LF = projectEnd
  const hasSuccessor = new Set(edges.map((e) => e.from));
  for (const t of leafTasks) {
    if (!hasSuccessor.has(t.id)) {
      lf.set(t.id, projectEnd);
      ls.set(t.id, projectEnd - (ef.get(t.id)! - es.get(t.id)!));
    }
  }

  // Backward Pass
  for (const id of [...topoOrder].reverse()) {
    for (const e of revAdj.get(id) ?? []) {
      const predId = e.to; // в обратном графе to = исходный from
      const lag = e.lagDays * MS_PER_DAY;
      const curLS = ls.get(id)!;
      const curLF = lf.get(id)!;

      let newLF: number;
      switch (e.type) {
        case 'FS':
          newLF = curLS - lag;
          break;
        case 'SS':
          newLF = curLS - lag + (ef.get(predId)! - es.get(predId)!);
          break;
        case 'FF':
          newLF = curLF - lag;
          break;
        case 'SF':
          newLF = curLF - lag + (ef.get(predId)! - es.get(predId)!);
          break;
        default:
          newLF = curLS - lag;
      }

      if (newLF < (lf.get(predId) ?? Infinity)) {
        const dur = ef.get(predId)! - es.get(predId)!;
        lf.set(predId, newLF);
        ls.set(predId, newLF - dur);
      }
    }
  }

  // Slack = LS - ES; при slack ≈ 0 → критический путь
  // Используем допуск 1 час для float-рounding
  const TOLERANCE_MS = 60 * 60 * 1000;
  const criticalIds: string[] = [];
  for (const t of leafTasks) {
    const slack = (ls.get(t.id) ?? 0) - (es.get(t.id) ?? 0);
    if (Math.abs(slack) <= TOLERANCE_MS) {
      criticalIds.push(t.id);
    }
  }

  return criticalIds;
}
