'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
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
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';

interface Props {
  objectId: string;
  versionId: string;
}

export function GanttCoordinationView({ objectId, versionId }: Props) {
  const { data, isLoading } = useGanttTasksGPR(objectId, versionId);
  const updateTask = useUpdateTaskGPR(objectId, versionId);
  const createTask = useCreateTaskGPR(objectId, versionId);
  const deleteTask = useDeleteTaskGPR(objectId, versionId);
  const bulkUpdate = useUpdateTasksBulkGPR(objectId, versionId);
  const { toast } = useToast();

  const [editTask, setEditTask] = useState<GanttTaskItem | null>(null);
  const [editTab, setEditTab] = useState<'main' | 'extra'>('main');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isolatedId, setIsolatedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allTasks: GanttTaskItem[] = data.tasks;

  // Если включена изоляция — показываем только задачу и её потомков
  const tasks = isolatedId
    ? allTasks.filter((t) => t.id === isolatedId || t.parentId === isolatedId)
    : allTasks;

  if (tasks.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">Нет задач в данной версии ГПР</p>
      </div>
    );
  }

  // Сводная строка: суммарные даты по задачам верхнего уровня
  const topLevel = tasks.filter((t: GanttTaskItem) => !t.parentId);
  const summaryStart = topLevel.map((t: GanttTaskItem) => t.planStart).sort()[0] ?? null;
  const summaryEnd = topLevel.map((t: GanttTaskItem) => t.planEnd).sort().at(-1) ?? null;

  function handleUpdate(taskId: string, field: string, value: string) {
    // Конвертируем date-строку в ISO для API
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
        {isolatedId && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 border-b text-xs text-amber-700">
            <span>Изоляция задачи.</span>
            <button
              className="underline hover:no-underline"
              onClick={() => setIsolatedId(null)}
            >
              Сбросить
            </button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
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
            {summaryStart && (
              <TableRow className="text-xs font-semibold bg-muted/30">
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
            {tasks.map((task: GanttTaskItem) => (
              <GanttCoordinationRow
                key={task.id}
                task={task}
                onUpdate={handleUpdate}
                onEdit={(t) => { setEditTab('main'); setEditTask(t); }}
                onEditFiles={(t) => { setEditTab('extra'); setEditTask(t); }}
                onAddChild={handleAddChild}
                onAddBelow={handleAddBelow}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDelete={(id) => setDeleteId(id)}
                onMilestone={handleMilestone}
                onIsolate={(id) => setIsolatedId(id)}
                onCopy={handleCopy}
              />
            ))}
          </TableBody>
        </Table>
      </div>

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
