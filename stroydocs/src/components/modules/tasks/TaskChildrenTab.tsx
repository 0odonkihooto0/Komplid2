'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { TaskStatus, TaskPriority } from './useGlobalTasks';

interface ChildTask { id: string; title: string; status: TaskStatus; priority: TaskPriority; deadline: string | null }

const STATUS_COLORS: Record<TaskStatus, string> = {
  OPEN: 'bg-gray-100 text-gray-700', PLANNED: 'bg-sky-100 text-sky-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700', UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  REVISION: 'bg-orange-100 text-orange-700', DONE: 'bg-green-100 text-green-700',
  IRRELEVANT: 'bg-gray-100 text-gray-400', CANCELLED: 'bg-red-100 text-red-700',
};
const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Открыта', PLANNED: 'Запланирована', IN_PROGRESS: 'В работе',
  UNDER_REVIEW: 'На проверке', REVISION: 'На доработке', DONE: 'Выполнена',
  IRRELEVANT: 'Неактуальна', CANCELLED: 'Отменена',
};

interface Props {
  childTasks: ChildTask[];
  parentTaskId: string;
  onOpenTask: (id: string) => void;
  onCreateSubtask: () => void;
}

export function TaskChildrenTab({ childTasks, onOpenTask, onCreateSubtask }: Props) {
  return (
    <div className="p-4">
      <div className="mb-3">
        <Button size="sm" onClick={onCreateSubtask}>
          <Plus className="mr-1 h-4 w-4" /> Создать подчинённую задачу
        </Button>
      </div>

      {childTasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Подчинённых задач нет</p>
      ) : (
        <div className="space-y-1">
          {childTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onOpenTask(task.id)}
              className="flex w-full items-center gap-3 rounded-lg border bg-white px-3 py-2 text-left hover:bg-gray-50"
            >
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[task.status])}>
                {STATUS_LABELS[task.status]}
              </span>
              <span className="flex-1 text-sm font-medium">{task.title}</span>
              {task.deadline && (
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(task.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
