'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlannerTaskRow } from './PlannerTaskRow';
import { useReorderPlannerTask } from './usePlannerTasks';
import type { PlannerTask } from './usePlannerTasks';

interface Props {
  tasks: PlannerTask[];
  projectId: string;
  onEdit: (task: PlannerTask) => void;
  onCreateChild: (parentId: string) => void;
  onDelete: (task: PlannerTask) => void;
}

// Строит плоский список видимых строк с учётом раскрытых узлов дерева
function buildVisibleList(
  tasks: PlannerTask[],
  expandedIds: Set<string>,
): Array<{ task: PlannerTask; depth: number }> {
  // Группируем задачи по parentTaskId для быстрого обхода дерева
  const childrenMap = new Map<string | null, PlannerTask[]>();
  for (const task of tasks) {
    const key = task.parentTaskId;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(task);
  }

  // Сортируем каждую группу по полю order
  for (const [, children] of Array.from(childrenMap.entries())) {
    children.sort((a, b) => a.order - b.order);
  }

  const result: Array<{ task: PlannerTask; depth: number }> = [];

  // Рекурсивный обход: добавляем дочерние узлы только если родитель раскрыт
  function walk(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) ?? [];
    for (const task of children) {
      result.push({ task, depth });
      if (expandedIds.has(task.id)) {
        walk(task.id, depth + 1);
      }
    }
  }

  walk(null, 0);
  return result;
}

export function PlannerTaskTree({ tasks, projectId, onEdit, onCreateChild, onDelete }: Props) {
  // Множество раскрытых узлов дерева
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const reorderMutation = useReorderPlannerTask(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const flatList = buildVisibleList(tasks, expandedIds);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const overItem = flatList.find(r => r.task.id === over.id);
    if (!overItem) return;

    // Перемещаем задачу в позицию, занятую over-задачей (той же группы родителя)
    reorderMutation.mutate({
      taskId: active.id as string,
      newParentTaskId: overItem.task.parentTaskId,
      newOrder: overItem.task.order,
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="rounded-md border border-gray-200 overflow-hidden">
        {/* Заголовок колонок */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
          <span className="w-5" /> {/* placeholder для drag handle */}
          <span className="flex-1">Название</span>
          <span className="w-20 text-center">Приоритет</span>
          <span className="w-20 text-center">Статус</span>
          <span className="w-24">Ответственный</span>
          <span className="w-16">Срок</span>
          <span className="w-6" /> {/* placeholder для кнопки меню */}
        </div>
        <SortableContext items={flatList.map(r => r.task.id)} strategy={verticalListSortingStrategy}>
          {flatList.map(({ task, depth }) => (
            <PlannerTaskRow
              key={task.id}
              task={task}
              depth={depth}
              isExpanded={expandedIds.has(task.id)}
              onToggle={handleToggle}
              onCreateChild={onCreateChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}
