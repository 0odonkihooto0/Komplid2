'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, MessageSquare, CheckSquare, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useTasksPanel } from '@/components/modules/tasks/useTasksPanel';
import { TaskDetailDialog } from '@/components/modules/tasks/TaskDetailDialog';
import { CreateTaskDialogFull } from '@/components/modules/tasks/CreateTaskDialogFull';
import type { GlobalTask } from '@/components/modules/tasks/useGlobalTasks';

const TERMINAL = new Set(['DONE', 'IRRELEVANT', 'CANCELLED']);

function isOverdue(task: GlobalTask): boolean {
  return !!task.deadline && !TERMINAL.has(task.status) && new Date(task.deadline) < new Date();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

interface CardProps {
  task: GlobalTask;
  onOpen: (id: string) => void;
}

function TaskPanelCard({ task, onOpen }: CardProps) {
  const overdue = isOverdue(task);
  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      className={cn(
        'w-full text-left rounded-md border p-3 hover:bg-muted/60 transition-colors',
        overdue && 'border-l-4 border-l-red-500',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-sm leading-snug flex-1', !task.isReadByAuthor && 'font-semibold')}>
          {task.title}
        </span>
        {task.deadline && (
          <span className={cn('shrink-0 text-xs', overdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
            {formatDate(task.deadline)}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{formatDate(task.createdAt)}</span>
        {task._count.reports > 0 && (
          <span className="flex items-center gap-0.5">
            <MessageSquare className="h-3 w-3" />
            {task._count.reports}
          </span>
        )}
        {task._count.checklist > 0 && (
          <span className="flex items-center gap-0.5">
            <CheckSquare className="h-3 w-3" />
            {task._count.checklist}
          </span>
        )}
      </div>
    </button>
  );
}

export function TasksQuickPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { tasks, overdueCount, isLoading, refetch } = useTasksPanel();

  function handleOpen() {
    setOpen(true);
    refetch();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent transition-colors"
        aria-label="Задачи"
      >
        <ClipboardList className="h-5 w-5" />
        {overdueCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white leading-none">
            {overdueCount > 9 ? '9+' : overdueCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[400px] flex flex-col p-0">
          <SheetHeader className="flex-row items-center justify-between border-b px-4 py-3 space-y-0">
            <SheetTitle className="text-base">Задачи</SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => { router.push('/planner'); setOpen(false); }}
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                Все задачи
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Добавить
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-3 py-2">
            {isLoading && (
              <p className="py-8 text-center text-sm text-muted-foreground">Загрузка…</p>
            )}
            {!isLoading && tasks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Нет активных задач</p>
            )}
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <TaskPanelCard key={task.id} task={task} onOpen={setSelectedTaskId} />
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <TaskDetailDialog taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      <CreateTaskDialogFull open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
