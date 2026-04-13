import { useState, useCallback } from 'react';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';
import type { GroupByField } from './GanttGroupingMenu';

export interface GanttGroupHeader {
  _isGroupHeader: true;
  groupKey: string;
  groupLabel: string;
  count: number;
}

export type DisplayRow = GanttTaskItem | GanttGroupHeader;

export function isGroupHeader(row: DisplayRow): row is GanttGroupHeader {
  return '_isGroupHeader' in row && row._isGroupHeader === true;
}

export interface ContextMenuState {
  x: number;
  y: number;
  taskId: string;
}

// Метки для группировки
const GROUP_LABELS: Record<GroupByField, string> = {
  volumeUnit: 'Единицы',
  workType:   'Вид работ',
  costType:   'Тип стоимости',
};

// Строит плоский список DisplayRow с виртуальными заголовками-группами
function buildGroupedRows(tasks: GanttTaskItem[], field: GroupByField): DisplayRow[] {
  const groups = new Map<string, GanttTaskItem[]>();
  for (const t of tasks) {
    const raw = t[field as keyof GanttTaskItem];
    const key = (typeof raw === 'string' && raw) ? raw : '—';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const result: DisplayRow[] = [];
  const prefix = GROUP_LABELS[field];
  for (const [key, group] of Array.from(groups)) {
    result.push({
      _isGroupHeader: true,
      groupKey: key,
      groupLabel: `${prefix}: ${key}`,
      count: group.length,
    });
    result.push(...group);
  }
  return result;
}

// Проверяет, виден ли таск с учётом свёрнутых предков
function isTaskVisible(
  task: GanttTaskItem,
  allTasks: GanttTaskItem[],
  collapsedIds: Set<string>,
): boolean {
  let current = task;
  while (current.parentId) {
    if (collapsedIds.has(current.parentId)) return false;
    const parent = allTasks.find((t) => t.id === current.parentId);
    if (!parent) break;
    current = parent;
  }
  return true;
}

// Возвращает ID задачи и всех её потомков
function getDescendantIds(taskId: string, allTasks: GanttTaskItem[]): Set<string> {
  const result = new Set<string>([taskId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of allTasks) {
      if (t.parentId && result.has(t.parentId) && !result.has(t.id)) {
        result.add(t.id);
        changed = true;
      }
    }
  }
  return result;
}

// Возвращает ID задачи и всех её предков
function getAncestorIds(taskId: string, allTasks: GanttTaskItem[]): Set<string> {
  const result = new Set<string>([taskId]);
  let current = allTasks.find((t) => t.id === taskId);
  while (current?.parentId) {
    result.add(current.parentId);
    current = allTasks.find((t) => t.id === current!.parentId);
  }
  return result;
}

export function useGanttCoordinationState() {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Выбор задачи (чекбокс)
  const toggleSelect = useCallback((id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  // Развёртка/свёртка
  const toggleCollapse = useCallback((id: string) => {
    setCollapsedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedTaskIds(new Set());
  }, []);

  const collapseAll = useCallback((tasks: GanttTaskItem[]) => {
    // Свернуть только узлы у которых есть дочерние
    const parents = new Set(
      tasks.filter((t) => t.parentId).map((t) => t.parentId as string),
    );
    setCollapsedTaskIds(parents);
  }, []);

  const expandToLevel = useCallback((displayLevel: number, tasks: GanttTaskItem[]) => {
    // displayLevel=1 → показать только корень (level 0) → свернуть level >= 0
    // displayLevel=2 → показать level 0 и 1 → свернуть level >= 1
    // displayLevel=N → свернуть tasks с level >= N-1 у которых есть дети
    const parents = new Set(
      tasks.filter((t) => t.parentId).map((t) => t.parentId as string),
    );
    const toCollapse = tasks
      .filter((t) => t.level >= displayLevel - 1 && parents.has(t.id))
      .map((t) => t.id);
    setCollapsedTaskIds(new Set(toCollapse));
  }, []);

  // Контекстное меню
  const openContextMenu = useCallback((e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, taskId });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Вычисление видимых строк с учётом groupBy, изоляции и collapse
  const getDisplayRows = useCallback((
    allTasks: GanttTaskItem[],
    groupBy: GroupByField | null,
    isIsolated: boolean,
  ): DisplayRow[] => {
    // 1. Фильтр изоляции
    let filtered = allTasks;
    if (isIsolated && selectedTaskIds.size > 0) {
      // Показываем выбранные задачи + всех их предков (для контекста иерархии)
      const visibleIds = new Set<string>();
      for (const id of Array.from(selectedTaskIds)) {
        for (const aid of Array.from(getAncestorIds(id, allTasks))) {
          visibleIds.add(aid);
        }
      }
      filtered = allTasks.filter((t) => visibleIds.has(t.id));
    }

    // 2. Фильтр collapse
    const visible = filtered.filter((t) => isTaskVisible(t, allTasks, collapsedTaskIds));

    // 3. Группировка
    if (groupBy) {
      return buildGroupedRows(visible, groupBy);
    }
    return visible;
  }, [selectedTaskIds, collapsedTaskIds]);

  return {
    // Выбор
    selectedTaskIds,
    toggleSelect,
    clearSelection,
    getDescendantIds,
    // Collapse
    collapsedTaskIds,
    toggleCollapse,
    expandAll,
    collapseAll,
    expandToLevel,
    // Контекстное меню
    contextMenu,
    openContextMenu,
    closeContextMenu,
    // Вычисление строк
    getDisplayRows,
  };
}
