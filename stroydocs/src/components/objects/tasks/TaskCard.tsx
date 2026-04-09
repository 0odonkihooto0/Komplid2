'use client';

import { useState } from 'react';
import { Pencil, Trash2, CalendarDays, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { formatDate } from '@/utils/format';
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  type Task,
  type TaskStatus,
} from './useTasks';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function TaskCard({ task, onEdit, onStatusChange, onDelete, isDeleting }: TaskCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isOverdue =
    task.deadline && task.status !== 'DONE' && task.status !== 'CANCELLED'
      ? new Date(task.deadline) < new Date()
      : false;

  const assigneeName = task.assignee
    ? [task.assignee.lastName, task.assignee.firstName].filter(Boolean).join(' ')
    : null;

  return (
    <>
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            {/* Точка приоритета */}
            <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TASK_PRIORITY_COLORS[task.priority]}`} />

            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium leading-snug">{task.title}</p>

              {/* Дедлайн + исполнитель */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {task.deadline && (
                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
                    <CalendarDays className="h-3.5 w-3.5" />
                    {isOverdue && 'Просрочено: '}
                    {formatDate(task.deadline)}
                  </span>
                )}
                {assigneeName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {assigneeName}
                  </span>
                )}
                <span className="text-muted-foreground/60">
                  {TASK_PRIORITY_LABELS[task.priority]}
                </span>
              </div>
            </div>

            {/* Статус + действия */}
            <div className="flex shrink-0 items-center gap-2">
              <Select
                value={task.status}
                onValueChange={(v) => onStatusChange(task.id, v as TaskStatus)}
              >
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => onEdit(task)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName="задачу"
        onConfirm={() => {
          onDelete(task.id);
          setDeleteOpen(false);
        }}
        isPending={isDeleting}
      />
    </>
  );
}
