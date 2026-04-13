'use client';

import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGanttTasksGPR, useUpdateTaskGPR } from './useGanttScheduleHooks';
import { GanttCoordinationRow } from './GanttCoordinationRow';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';

interface Props {
  objectId: string;
  versionId: string;
}

export function GanttCoordinationView({ objectId, versionId }: Props) {
  const { data, isLoading } = useGanttTasksGPR(objectId, versionId);
  const updateTask = useUpdateTaskGPR(objectId, versionId);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tasks: GanttTaskItem[] = data.tasks;

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

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="min-w-48">Наименование</TableHead>
            <TableHead className="w-20">Индикаторы</TableHead>
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
            <GanttCoordinationRow key={task.id} task={task} onUpdate={handleUpdate} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
