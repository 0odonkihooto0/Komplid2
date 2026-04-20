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

export function GanttClosureView({ objectId, versionId }: Props) {
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
            <TableHead className="text-right w-24">Объём</TableHead>
            <TableHead className="text-right w-24">Факт объём</TableHead>
            {/* TODO: требует join WorkItem→KS2Line в /tasks endpoint */}
            <TableHead className="text-right w-32">Подтверждённый (КС-2)</TableHead>
            <TableHead className="text-right w-24">Остаток</TableHead>
            <TableHead className="min-w-32">% закрытия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task: GanttTaskItem) => {
            const indent = task.level * 16;
            return (
              <TableRow key={task.id} className="text-xs">
                <TableCell style={{ paddingLeft: `${indent + 8}px` }} className="max-w-48 truncate">
                  {task.name}
                </TableCell>
                <TableCell className="text-right">
                  {task.volume != null ? `${task.volume}${task.volumeUnit ? ' ' + task.volumeUnit : ''}` : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {task.factVolume != null ? `${task.factVolume}${task.volumeUnit ? ' ' + task.volumeUnit : ''}` : '—'}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-[10px]">скоро</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={task.progress} className="h-2 w-16" />
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
