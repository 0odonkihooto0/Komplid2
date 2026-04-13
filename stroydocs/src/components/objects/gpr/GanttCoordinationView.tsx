'use client';

import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/useToast';
import {
  useGanttTasksGPR,
  useUpdateTaskGPR,
  useCreateTaskGPR,
  useDeleteTaskGPR,
  useUpdateTasksBulkGPR,
} from './useGanttScheduleHooks';
import { GanttCoordinationRow } from './GanttCoordinationRow';
import { GanttTaskEditDialog } from './GanttTaskEditDialog';
import { GanttMultiSelectToolbar } from './GanttMultiSelectToolbar';
import { GanttMoveDialog } from './GanttMoveDialog';
import { GanttContextMenu } from './GanttContextMenu';
import {
  useGanttCoordinationState,
  isGroupHeader,
  type DisplayRow,
} from './useGanttCoordinationState';
import type { GroupByField } from './GanttGroupingMenu';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';

interface Props {
  objectId: string;
  versionId: string;
  // Режимы управляются родителем GanttScheduleView
  groupBy: GroupByField | null;
  isMultiSelectMode: boolean;
  onMultiSelectModeChange: (v: boolean) => void;
  isIsolated: boolean;
  onIsolationChange: (v: boolean) => void;
}

export function GanttCoordinationView({
  objectId,
  versionId,
  groupBy,
  isMultiSelectMode,
  onMultiSelectModeChange,
  isIsolated,
  onIsolationChange,
}: Props) {
  const { data, isLoading } = useGanttTasksGPR(objectId, versionId);
  const updateTask = useUpdateTaskGPR(objectId, versionId);
  const createTask = useCreateTaskGPR(objectId, versionId);
  const deleteTask = useDeleteTaskGPR(objectId, versionId);
  const bulkUpdate = useUpdateTasksBulkGPR(objectId, versionId);
  const { toast } = useToast();

  const [editTask, setEditTask] = useState<GanttTaskItem | null>(null);
  const [editTab, setEditTab] = useState<'main' | 'extra'>('main');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);

  // Новое состояние: выбор, collapse, контекстное меню
  const state = useGanttCoordinationState();

  // Закрыть режим multi-select и сбросить выбор
  function handleCloseMultiSelect() {
    onMultiSelectModeChange(false);
    onIsolationChange(false);
    state.clearSelection();
  }

  // Активировать изоляцию (из тулбара или из строки)
  function handleIsolateTask(taskId: string) {
    // Добавляем задачу в selectedTaskIds и включаем изоляцию
    if (!state.selectedTaskIds.has(taskId)) {
      state.toggleSelect(taskId);
    }
    onIsolationChange(true);
  }

  // Переместить выбранные задачи в другой раздел
  const handleMoveConfirm = useCallback((targetParentId: string | null) => {
    const ids = Array.from(state.selectedTaskIds);
    ids.forEach((id) => {
      updateTask.mutate({
        taskId: id,
        data: { parentId: targetParentId } as Parameters<typeof updateTask.mutate>[0]['data'],
      });
    });
    state.clearSelection();
    toast({ title: `Перемещено задач: ${ids.length}` });
  }, [state, updateTask, toast]);

  // Объединить в сводную задачу (заглушка — требует специального API)
  function handleMerge() {
    toast({ title: 'Объединение', description: 'Функция в разработке' });
  }

  // Назначить ответственного (заглушка)
  function handleAssign() {
    toast({ title: 'Назначение ответственного', description: 'Функция в разработке' });
  }

  // Навигация bulk-перемещения
  function handleBulkMoveUp() {
    const ids = Array.from(state.selectedTaskIds);
    if (ids.length === 0 || !allTasks) return;
    ids.forEach((id) => {
      const idx = allTasks.findIndex((t) => t.id === id);
      if (idx <= 0) return;
      const prev = allTasks[idx - 1];
      const curr = allTasks[idx];
      bulkUpdate.mutate([
        { id: curr.id, sortOrder: prev.sortOrder },
        { id: prev.id, sortOrder: curr.sortOrder },
      ]);
    });
  }

  function handleBulkMoveDown() {
    const ids = Array.from(state.selectedTaskIds);
    if (ids.length === 0 || !allTasks) return;
    ids.forEach((id) => {
      const idx = allTasks.findIndex((t) => t.id === id);
      if (idx < 0 || idx >= allTasks.length - 1) return;
      const next = allTasks[idx + 1];
      const curr = allTasks[idx];
      bulkUpdate.mutate([
        { id: curr.id, sortOrder: next.sortOrder },
        { id: next.id, sortOrder: curr.sortOrder },
      ]);
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allTasks: GanttTaskItem[] = data.tasks;

  // Набор ID задач у которых есть дочерние
  const parentIds = new Set(
    allTasks.filter((t) => t.parentId).map((t) => t.parentId as string),
  );

  // Вычисляем строки с учётом группировки, изоляции и collapse
  const displayRows: DisplayRow[] = state.getDisplayRows(allTasks, groupBy, isIsolated);

  if (displayRows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">Нет задач в данной версии ГПР</p>
      </div>
    );
  }

  // Сводная строка: суммарные даты по задачам верхнего уровня
  const topLevel = allTasks.filter((t) => !t.parentId);
  const summaryStart = topLevel.map((t) => t.planStart).sort()[0] ?? null;
  const summaryEnd = topLevel.map((t) => t.planEnd).sort().at(-1) ?? null;

  function handleUpdate(taskId: string, field: string, value: string) {
    const isoValue = new Date(value).toISOString();
    updateTask.mutate({
      taskId,
      data: { [field]: isoValue } as Parameters<typeof updateTask.mutate>[0]['data'],
    });
  }

  function handleAddChild(parentId: string) {
    const parent = allTasks.find((t) => t.id === parentId);
    if (!parent) return;
    createTask.mutate({
      name: 'Новая задача',
      planStart: parent.planStart,
      planEnd: parent.planEnd,
      parentId,
      level: (parent.level ?? 0) + 1,
    });
  }

  function handleAddBelow(task: GanttTaskItem) {
    createTask.mutate({
      name: 'Новая задача',
      planStart: task.planStart,
      planEnd: task.planEnd,
      parentId: task.parentId ?? undefined,
      level: task.level,
      sortOrder: task.sortOrder + 1,
    });
  }

  function handleMoveUp(taskId: string) {
    const idx = allTasks.findIndex((t) => t.id === taskId);
    if (idx <= 0) return;
    const prev = allTasks[idx - 1];
    const curr = allTasks[idx];
    bulkUpdate.mutate([
      { id: curr.id, sortOrder: prev.sortOrder },
      { id: prev.id, sortOrder: curr.sortOrder },
    ]);
  }

  function handleMoveDown(taskId: string) {
    const idx = allTasks.findIndex((t) => t.id === taskId);
    if (idx < 0 || idx >= allTasks.length - 1) return;
    const next = allTasks[idx + 1];
    const curr = allTasks[idx];
    bulkUpdate.mutate([
      { id: curr.id, sortOrder: next.sortOrder },
      { id: next.id, sortOrder: curr.sortOrder },
    ]);
  }

  function handleMilestone(taskId: string) {
    updateTask.mutate({ taskId, data: { isMilestone: true } });
    toast({ title: 'Задача помечена как веха' });
  }

  function handleCopy(task: GanttTaskItem) {
    createTask.mutate({
      name: `${task.name} (копия)`,
      planStart: task.planStart,
      planEnd: task.planEnd,
      parentId: task.parentId ?? undefined,
      level: task.level,
      sortOrder: task.sortOrder + 1,
    });
  }

  const deleteTarget = deleteId ? allTasks.find((t) => t.id === deleteId) : null;

  return (
    <>
      <div className="overflow-auto">
        {/* Баннер изоляции */}
        {isIsolated && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 border-b text-xs text-amber-700">
            <span>Изоляция отмеченных задач ({state.selectedTaskIds.size}).</span>
            <button
              className="underline hover:no-underline"
              onClick={() => onIsolationChange(false)}
            >
              Показать все
            </button>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              {/* Колонка чекбоксов в режиме multi-select */}
              {isMultiSelectMode && (
                <TableHead className="w-8 pr-0">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 cursor-pointer"
                    checked={
                      allTasks.length > 0 &&
                      allTasks.every((t) => state.selectedTaskIds.has(t.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        allTasks.forEach((t) => {
                          if (!state.selectedTaskIds.has(t.id)) state.toggleSelect(t.id);
                        });
                      } else {
                        state.clearSelection();
                      }
                    }}
                    title="Выбрать все"
                  />
                </TableHead>
              )}
              <TableHead className="min-w-52">Наименование</TableHead>
              <TableHead className="w-24">Индикаторы</TableHead>
              <TableHead className="text-right w-24">Плановый физ. объём</TableHead>
              <TableHead className="w-16">Ед.</TableHead>
              <TableHead className="text-right w-24">Сумма</TableHead>
              <TableHead className="w-24">План Начало</TableHead>
              <TableHead className="w-24">План Оконч.</TableHead>
              <TableHead className="text-right w-16">Пл. дней</TableHead>
              <TableHead className="text-right w-20">Пл. объём</TableHead>
              <TableHead className="w-24">Факт Начало</TableHead>
              <TableHead className="w-24">Факт Оконч.</TableHead>
              <TableHead className="text-right w-16">Факт дней</TableHead>
              <TableHead className="text-right w-20">Факт объём</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Сводная строка проекта */}
            {summaryStart && !isIsolated && !groupBy && (
              <TableRow className="text-xs font-semibold bg-muted/30">
                {isMultiSelectMode && <TableCell />}
                <TableHead className="pl-2">Итого по версии</TableHead>
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead className="font-normal text-xs">
                  {new Date(summaryStart).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </TableHead>
                <TableHead className="font-normal text-xs">
                  {summaryEnd ? new Date(summaryEnd).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                </TableHead>
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
              </TableRow>
            )}

            {displayRows.map((row) => {
              // Виртуальный заголовок группы
              if (isGroupHeader(row)) {
                const colSpan = isMultiSelectMode ? 14 : 13;
                return (
                  <TableRow key={`group-${row.groupKey}`} className="bg-muted/50 text-xs font-semibold">
                    <TableCell colSpan={colSpan} className="py-1 px-3 text-primary">
                      {row.groupLabel}
                      <span className="ml-2 font-normal text-muted-foreground">
                        ({row.count})
                      </span>
                    </TableCell>
                  </TableRow>
                );
              }

              // Обычная строка задачи
              return (
                <GanttCoordinationRow
                  key={row.id}
                  task={row}
                  onUpdate={handleUpdate}
                  onEdit={(t) => { setEditTab('main'); setEditTask(t); }}
                  onEditFiles={(t) => { setEditTab('extra'); setEditTask(t); }}
                  onAddChild={handleAddChild}
                  onAddBelow={handleAddBelow}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onDelete={(id) => setDeleteId(id)}
                  onMilestone={handleMilestone}
                  onIsolate={handleIsolateTask}
                  onCopy={handleCopy}
                  // Multi-select
                  isMultiSelectMode={isMultiSelectMode}
                  isSelected={state.selectedTaskIds.has(row.id)}
                  onSelectToggle={state.toggleSelect}
                  // Collapse
                  hasChildren={parentIds.has(row.id)}
                  isCollapsed={state.collapsedTaskIds.has(row.id)}
                  onToggleCollapse={state.toggleCollapse}
                  // Контекстное меню
                  onContextMenuOpen={state.openContextMenu}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Плавающий тулбар множественного редактирования */}
      {isMultiSelectMode && (
        <GanttMultiSelectToolbar
          selectedCount={state.selectedTaskIds.size}
          onClose={handleCloseMultiSelect}
          onMove={() => setMoveOpen(true)}
          onMerge={handleMerge}
          onAssign={handleAssign}
          onMoveUp={handleBulkMoveUp}
          onMoveDown={handleBulkMoveDown}
          onMoveLeft={() => toast({ title: 'Повышение уровня', description: 'Функция в разработке' })}
          onMoveRight={() => toast({ title: 'Понижение уровня', description: 'Функция в разработке' })}
        />
      )}

      {/* Диалог перемещения */}
      <GanttMoveDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        allTasks={allTasks}
        movingTaskIds={state.selectedTaskIds}
        onConfirm={handleMoveConfirm}
      />

      {/* Контекстное меню иконки раздела */}
      {state.contextMenu && (
        <GanttContextMenu
          x={state.contextMenu.x}
          y={state.contextMenu.y}
          onClose={state.closeContextMenu}
          onExpandAll={state.expandAll}
          onCollapseAll={() => state.collapseAll(allTasks)}
          onExpandToLevel={(n) => state.expandToLevel(n, allTasks)}
        />
      )}

      {/* Диалог редактирования задачи */}
      {editTask && (
        <GanttTaskEditDialog
          open={!!editTask}
          onOpenChange={(open) => { if (!open) setEditTask(null); }}
          task={editTask}
          objectId={objectId}
          versionId={versionId}
          allTasks={allTasks}
          defaultTab={editTab}
        />
      )}

      {/* Подтверждение удаления */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleteTarget?.name ?? ''}» и все дочерние задачи будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) deleteTask.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
