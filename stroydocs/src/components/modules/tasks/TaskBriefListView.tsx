'use client';

import { MessageSquare, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { type GlobalTask, type TaskPriority, type TaskStatus } from './useGlobalTasks';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-400', MEDIUM: 'bg-yellow-500', HIGH: 'bg-orange-500', CRITICAL: 'bg-red-600',
};

const TERMINAL: TaskStatus[] = ['DONE', 'IRRELEVANT', 'CANCELLED'];

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

interface Props {
  tasks: GlobalTask[];
  isLoading: boolean;
  onTaskClick?: (id: string) => void;
}

export function TaskBriefListView({ tasks, isLoading, onTaskClick }: Props) {
  if (isLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        Задачи не найдены
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto divide-y">
      {tasks.map((task) => {
        const isOverdue =
          task.deadline &&
          !TERMINAL.includes(task.status) &&
          new Date(task.deadline) < new Date();

        return (
          <div
            key={task.id}
            className={cn('flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50', onTaskClick && 'cursor-pointer')}
            onClick={() => onTaskClick?.(task.id)}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', PRIORITY_COLORS[task.priority])} />

            <span className={cn('flex-1 text-sm text-gray-800 truncate', !task.isReadByAuthor && 'font-semibold')}>
              {task.title}
            </span>

            {task.labels.slice(0, 2).map(({ label }) => (
              <span
                key={label.id}
                className="hidden sm:inline-flex h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: label.color }}
                title={label.name}
              />
            ))}

            {task._count.reports > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <MessageSquare className="h-3 w-3" />{task._count.reports}
              </span>
            )}

            {task._count.checklist > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <CheckSquare className="h-3 w-3" />{task._count.checklist}
              </span>
            )}

            <span className={cn('text-xs', isOverdue ? 'font-medium text-red-600' : 'text-gray-400')}>
              {formatDate(task.deadline)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
