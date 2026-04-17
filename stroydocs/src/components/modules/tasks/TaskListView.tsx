'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { type GlobalTask, type TaskStatus, type TaskPriority, type TaskRoleType } from './useGlobalTasks';

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Открыта', PLANNED: 'Запланирована', IN_PROGRESS: 'В работе',
  UNDER_REVIEW: 'На проверке', REVISION: 'На доработке', DONE: 'Выполнена',
  IRRELEVANT: 'Неактуальна', CANCELLED: 'Отменена',
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  OPEN: 'bg-gray-100 text-gray-700',
  PLANNED: 'bg-sky-100 text-sky-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  REVISION: 'bg-orange-100 text-orange-700',
  DONE: 'bg-green-100 text-green-700',
  IRRELEVANT: 'bg-gray-100 text-gray-400',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Низкий', MEDIUM: 'Средний', HIGH: 'Высокий', CRITICAL: 'Критичный',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'text-gray-500', MEDIUM: 'text-yellow-600', HIGH: 'text-orange-600', CRITICAL: 'text-red-600',
};

const TERMINAL_STATUSES: TaskStatus[] = ['DONE', 'IRRELEVANT', 'CANCELLED'];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function DeadlineCell({ deadline, status }: { deadline: string | null; status: TaskStatus }) {
  if (!deadline) return <span className="text-gray-400">—</span>;
  const isOverdue = !TERMINAL_STATUSES.includes(status) && new Date(deadline) < new Date();
  return (
    <span className={cn('text-sm', isOverdue ? 'font-medium text-red-600' : 'text-gray-700')}>
      {formatDate(deadline)}
    </span>
  );
}

function ExecutorAvatars({ roles }: { roles: GlobalTask['roles'] }) {
  const executors = roles.filter((r) => r.role === ('EXECUTOR' as TaskRoleType));
  if (executors.length === 0) return <span className="text-gray-400">—</span>;
  const visible = executors.slice(0, 3);
  const extra = executors.length - 3;
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center -space-x-1">
        {visible.map(({ user }) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Avatar className="h-6 w-6 border-2 border-white">
                <AvatarFallback className="text-[10px]">
                  {user.firstName[0]}{user.lastName[0]}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{user.firstName} {user.lastName}</TooltipContent>
          </Tooltip>
        ))}
        {extra > 0 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[10px] font-medium text-gray-600">
            +{extra}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function LabelBadges({ labels }: { labels: GlobalTask['labels'] }) {
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.slice(0, 3).map(({ label }) => (
        <span
          key={label.id}
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: label.color }}
        >
          {label.name}
        </span>
      ))}
      {labels.length > 3 && (
        <span className="text-[10px] text-gray-400">+{labels.length - 3}</span>
      )}
    </div>
  );
}

function TaskActionsMenu({ task, onTaskClick }: { task: GlobalTask; onTaskClick: (id: string) => void }) {
  function copyLink() {
    if (task.publicLinkToken) {
      void navigator.clipboard.writeText(
        `${window.location.origin}/tasks/public/${task.publicLinkToken}`,
      );
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onTaskClick(task.id)}>Информация</DropdownMenuItem>
        <DropdownMenuItem onClick={copyLink} disabled={!task.publicLinkToken}>
          Скопировать ссылку
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface Props {
  tasks: GlobalTask[];
  isLoading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onTaskClick?: (id: string) => void;
}

export function TaskListView({ tasks, isLoading, total, page, totalPages, onPageChange, onTaskClick }: Props) {
  const PAGE_SIZE = 20;

  function handleTaskClick(id: string) {
    // TASK.6: здесь будет открытие карточки задачи
    onTaskClick?.(id);
  }

  const columns: ColumnDef<GlobalTask>[] = [
    {
      id: 'index',
      header: '№',
      cell: ({ row }) => (
        <span className="text-xs text-gray-400">{(page - 1) * PAGE_SIZE + row.index + 1}</span>
      ),
      size: 48,
    },
    {
      accessorKey: 'title',
      header: 'Наименование',
      cell: ({ row }) => (
        <button
          onClick={() => handleTaskClick(row.original.id)}
          className={cn(
            'text-left text-sm hover:underline',
            !row.original.isReadByAuthor && 'font-semibold',
          )}
        >
          {row.original.title}
        </button>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          TASK_STATUS_COLORS[row.original.status],
        )}>
          {TASK_STATUS_LABELS[row.original.status]}
        </span>
      ),
      size: 130,
    },
    {
      accessorKey: 'plannedStartDate',
      header: 'Начало',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">{formatDate(row.original.plannedStartDate)}</span>
      ),
      size: 90,
    },
    {
      accessorKey: 'deadline',
      header: 'Срок',
      cell: ({ row }) => (
        <DeadlineCell deadline={row.original.deadline} status={row.original.status} />
      ),
      size: 90,
    },
    {
      accessorKey: 'priority',
      header: 'Приоритет',
      cell: ({ row }) => (
        <span className={cn('text-xs font-medium', PRIORITY_COLORS[row.original.priority])}>
          {PRIORITY_LABELS[row.original.priority]}
        </span>
      ),
      size: 90,
    },
    {
      id: 'executors',
      header: 'Исполнители',
      cell: ({ row }) => <ExecutorAvatars roles={row.original.roles} />,
      size: 120,
    },
    {
      id: 'labels',
      header: 'Метки',
      cell: ({ row }) => <LabelBadges labels={row.original.labels} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <TaskActionsMenu task={row.original} onTaskClick={handleTaskClick} />
      ),
      size: 40,
    },
  ];

  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.getSize() !== 150 ? header.column.getSize() : undefined }}
                    className="text-xs font-medium text-gray-500"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-16 text-center text-gray-400">
                  Задачи не найдены
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleTaskClick(row.original.id)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t bg-white px-4 py-2">
          <span className="text-xs text-gray-500">Всего: {total}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-600">
              Стр. {page} из {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
