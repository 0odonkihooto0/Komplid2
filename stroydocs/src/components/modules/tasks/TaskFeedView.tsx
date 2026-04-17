'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type TaskStatus } from './useGlobalTasks';
import { useFeedTasks } from './useFeedTasks';

const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Открыта', PLANNED: 'Запланирована', IN_PROGRESS: 'В работе',
  UNDER_REVIEW: 'На проверке', REVISION: 'На доработке', DONE: 'Выполнена',
  IRRELEVANT: 'Неактуальна', CANCELLED: 'Отменена',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  OPEN: 'bg-gray-100 text-gray-700',
  PLANNED: 'bg-sky-100 text-sky-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  REVISION: 'bg-orange-100 text-orange-700',
  DONE: 'bg-green-100 text-green-700',
  IRRELEVANT: 'bg-gray-100 text-gray-400',
  CANCELLED: 'bg-red-100 text-red-700',
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  grouping: string;
  groupId?: string;
  search?: string;
}

export function TaskFeedView({ grouping, groupId, search }: Props) {
  const { items, isLoading, page, setPage, hasMore } = useFeedTasks({ grouping, groupId, search });

  if (isLoading && page === 1) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        Активности не найдено
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {items.map((item) => {
          const author = item.author;
          const initials = `${author.firstName[0]}${author.lastName[0]}`;
          const actionText = item.type === 'task_created' ? 'создал(а) задачу' : 'добавил(а) отчёт';

          return (
            <div key={item.id} className="flex gap-3 rounded-lg border bg-white p-4 shadow-sm">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">
                    {author.firstName} {author.lastName}
                  </span>
                  <span className="text-gray-500">{actionText}</span>
                  <span className="ml-auto text-xs text-gray-400 shrink-0">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>

                <p className="mt-1 text-sm font-semibold text-gray-800 truncate">{item.taskTitle}</p>

                {item.content && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.content}</p>
                )}

                {!item.content && item.taskDescription && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.taskDescription}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                    STATUS_COLORS[item.taskStatus],
                  )}>
                    {STATUS_LABELS[item.taskStatus]}
                  </span>
                  {item.taskLabels.map((label) => (
                    <span
                      key={label.id}
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={isLoading}>
              {isLoading ? 'Загрузка...' : 'Загрузить ещё'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
