'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Printer, Link, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaskDetail } from './useTaskDetail';
import type { TaskRoleType, TaskStatus } from './useGlobalTasks';
import { TaskActionsMenu } from './TaskActionsMenu';

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

interface Props {
  task: TaskDetail;
  currentUserRole: TaskRoleType | null;
  onUpdate: (data: Record<string, unknown>) => void;
  onAction: (action: string, payload?: Record<string, unknown>) => void;
  onClose: () => void;
  onCopyLink: () => void;
  onCreateSubtask: () => void;
}

export function TaskDetailHeader({
  task, currentUserRole, onUpdate, onAction, onClose, onCopyLink, onCreateSubtask,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const titleRef = useRef<HTMLInputElement>(null);

  const canEditTitle = currentUserRole === 'AUTHOR' || currentUserRole === 'CONTROLLER';

  useEffect(() => { setTitleValue(task.title); }, [task.title]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  function commitTitle() {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate({ title: trimmed });
    }
    setEditingTitle(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitTitle();
    if (e.key === 'Escape') { setTitleValue(task.title); setEditingTitle(false); }
  }

  return (
    <div className="flex flex-col gap-2 border-b px-6 py-4">
      <div className="flex items-start gap-2">
        <span className="mt-1 shrink-0 text-xs font-mono text-gray-400">
          #{task.id.slice(-6).toUpperCase()}
        </span>

        {editingTitle ? (
          <input
            ref={titleRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 rounded border border-blue-400 px-2 py-0.5 text-base font-semibold outline-none"
          />
        ) : (
          <h2
            className={cn(
              'flex-1 text-base font-semibold leading-snug text-gray-900',
              canEditTitle && 'cursor-text hover:bg-gray-50 rounded px-1',
            )}
            onClick={() => { if (canEditTitle) setEditingTitle(true); }}
          >
            {task.title}
          </h2>
        )}

        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[task.status])}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <TaskActionsMenu
          task={task}
          currentUserRole={currentUserRole}
          onAction={onAction}
          onCreateSubtask={onCreateSubtask}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCopyLink}>
              <Link className="mr-2 h-4 w-4" /> Скопировать ссылку
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Печать
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClose}>
              <X className="mr-2 h-4 w-4" /> Закрыть
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
