'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGanttTasksGPR } from './useGanttScheduleHooks';
import { GanttExecDocsSheet } from './GanttExecDocsSheet';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';

interface Props {
  objectId: string;
  versionId: string;
}

export function GanttIdSkView({ objectId, versionId }: Props) {
  const { data, isLoading } = useGanttTasksGPR(objectId, versionId);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tasks = [...data.tasks].sort(
    (a: GanttTaskItem, b: GanttTaskItem) => b.linkedExecutionDocsCount - a.linkedExecutionDocsCount,
  );
  const openTask = tasks.find((t: GanttTaskItem) => t.id === openTaskId) ?? null;

  if (tasks.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">Нет задач в данной версии ГПР</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="min-w-48">Задача ГПР</TableHead>
              <TableHead className="w-24 text-center">Кол-во ИД</TableHead>
              <TableHead className="w-36">Статус задачи</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task: GanttTaskItem) => (
              <TableRow key={task.id} className="text-xs">
                <TableCell
                  className="max-w-48 truncate"
                  style={{ paddingLeft: `${task.level * 16 + 8}px` }}
                >
                  {task.name}
                </TableCell>
                <TableCell className="text-center">
                  {task.linkedExecutionDocsCount > 0 ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {task.linkedExecutionDocsCount}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{task.status}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => setOpenTaskId(task.id)}
                  >
                    <FileText className="h-3.5 w-3.5" /> ИД
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {openTask && (
        <GanttExecDocsSheet
          objectId={objectId}
          versionId={versionId}
          taskId={openTask.id}
          taskName={openTask.name}
          open={!!openTaskId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </>
  );
}
