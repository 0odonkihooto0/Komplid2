'use client';

import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useGanttTasksGPR } from './useGanttScheduleHooks';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';

interface Props {
  objectId: string;
  versionId: string;
}

// Разница в днях: положительная = задержка, отрицательная = опережение
function daysDiff(base: string | null, actual: string | null): string | null {
  if (!base || !actual) return null;
  return String(Math.round((new Date(actual).getTime() - new Date(base).getTime()) / 86400000));
}

function fmt(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function GanttPlanFactView({ objectId, versionId }: Props) {
  const { data, isLoading } = useGanttTasksGPR(objectId, versionId);

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

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="min-w-48">Наименование</TableHead>
            <TableHead className="w-28">Прогноз начало</TableHead>
            <TableHead className="w-28">Прогноз окончание</TableHead>
            <TableHead className="w-32">Откл. от директивного</TableHead>
            <TableHead className="w-32">Откл. от оперативного</TableHead>
            <TableHead className="min-w-28">Динамика выполнения</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task: GanttTaskItem) => {
            // Прогноз = факт если начато, иначе план
            const forecastStart = task.factStart ?? task.planStart;
            const forecastEnd = task.factEnd ?? task.planEnd;
            const devDirective = daysDiff(task.planEnd, forecastEnd);
            const devOperative = task.factEnd ? daysDiff(task.planEnd, task.factEnd) : null;
            const devColor = devDirective && Number(devDirective) > 0 ? 'text-red-600' : 'text-green-600';
            const indent = task.level * 16;

            return (
              <TableRow key={task.id} className="text-xs">
                <TableCell style={{ paddingLeft: `${indent + 8}px` }} className="max-w-48 truncate">
                  {task.name}
                </TableCell>
                <TableCell>{fmt(forecastStart)}</TableCell>
                <TableCell>{fmt(forecastEnd)}</TableCell>
                <TableCell className={devDirective ? devColor : ''}>
                  {devDirective ? `${Number(devDirective) > 0 ? '+' : ''}${devDirective} дн.` : '—'}
                </TableCell>
                <TableCell>
                  {devOperative ? `${Number(devOperative) > 0 ? '+' : ''}${devOperative} дн.` : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={task.progress} className="h-2 w-20" />
                    <span className="text-muted-foreground">{task.progress}%</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
