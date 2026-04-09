'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useTasks,
  TASK_STATUS_LABELS,
  type Task,
  type TaskStatus,
  type CreateTaskData,
  type UpdateTaskData,
} from './useTasks';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';

// Кнопки фильтра
const FILTER_OPTIONS: Array<{ label: string; value: TaskStatus | null }> = [
  { label: 'Все', value: null },
  { label: TASK_STATUS_LABELS.OPEN, value: 'OPEN' },
  { label: TASK_STATUS_LABELS.IN_PROGRESS, value: 'IN_PROGRESS' },
  { label: TASK_STATUS_LABELS.DONE, value: 'DONE' },
];

interface TasksViewProps {
  projectId: string;
}

export function TasksView({ projectId }: TasksViewProps) {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const { tasks, isLoading, createMutation, updateMutation, deleteMutation } = useTasks(
    projectId,
    statusFilter
  );

  function handleCreate(data: CreateTaskData) {
    createMutation.mutate(data, { onSuccess: () => setDialogOpen(false) });
  }

  function handleUpdate(id: string, data: UpdateTaskData) {
    updateMutation.mutate(
      { id, data },
      {
        onSuccess: () => {
          setEditTask(null);
          setDialogOpen(false);
        },
      }
    );
  }

  function handleEdit(task: Task) {
    setEditTask(task);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    if (!open) setEditTask(null);
    setDialogOpen(open);
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Задачи</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Создать задачу
        </Button>
      </div>

      {/* Фильтр статусов */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={String(opt.value)}
            variant={statusFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Список задач */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 py-16 text-center">
          <p className="text-sm font-medium">Задач нет</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {statusFilter
              ? `Нет задач со статусом «${TASK_STATUS_LABELS[statusFilter]}»`
              : 'Создайте первую задачу по этому объекту'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEdit}
              onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        projectId={projectId}
        editTask={editTask}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
