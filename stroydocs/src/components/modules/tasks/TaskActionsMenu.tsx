'use client';

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaskDetail } from './useTaskDetail';
import type { TaskRoleType, TaskStatus } from './useGlobalTasks';

interface Props {
  task: TaskDetail;
  currentUserRole: TaskRoleType | null;
  onAction: (action: string, payload?: Record<string, unknown>) => void;
  onCreateSubtask: () => void;
}

interface MenuItem {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

function getMenuItems(role: TaskRoleType | null, status: TaskStatus): MenuItem[][] {
  const common: MenuItem[] = [
    { label: 'Копировать задачу', action: 'copy' },
    { label: 'Создать шаблон', action: 'to-template' },
  ];

  if (!role) return [common];

  if (role === 'AUTHOR') {
    const authorItems: MenuItem[] = [
      { label: 'Отметить неактуальной', action: 'mark-irrelevant' },
    ];
    if (status === 'UNDER_REVIEW') {
      authorItems.unshift(
        { label: 'Начать проверку', action: 'review-start' },
        { label: 'Принять', action: 'accept' },
        { label: 'Вернуть на доработку', action: 'return-to-revision' },
        { label: 'Обсудить', action: 'discuss' },
      );
    }
    return [authorItems, common];
  }

  if (role === 'CONTROLLER') {
    const controllerItems: MenuItem[] = [
      { label: 'Отметить неактуальной', action: 'mark-irrelevant' },
    ];
    if (status === 'UNDER_REVIEW') {
      controllerItems.unshift(
        { label: 'Начать проверку', action: 'review-start' },
        { label: 'Принять', action: 'accept' },
        { label: 'Вернуть на доработку', action: 'return-to-revision' },
        { label: 'Обсудить', action: 'discuss' },
      );
    }
    return [controllerItems, common];
  }

  if (role === 'EXECUTOR') {
    const executorItems: MenuItem[] = [];
    if (status === 'OPEN' || status === 'PLANNED') {
      executorItems.push({ label: 'Взять задачу в работу', action: 'start' });
    }
    if (status === 'IN_PROGRESS') {
      executorItems.push({ label: 'Отправить на проверку', action: 'send-to-review' });
      executorItems.push({ label: 'Делегировать', action: 'delegate' });
    }
    if (status === 'UNDER_REVIEW') {
      executorItems.push({ label: 'Отменить отправку', action: 'cancel-review' });
    }
    if (status === 'REVISION') {
      executorItems.push({ label: 'Отправить на проверку', action: 'send-to-review' });
    }
    executorItems.push({ label: 'Перенаправить', action: 'redirect' });
    return [executorItems, common];
  }

  // OBSERVER — только common
  return [common];
}

export function TaskActionsMenu({ task, currentUserRole, onAction, onCreateSubtask }: Props) {
  const groups = getMenuItems(currentUserRole, task.status);
  const hasItems = groups.some((g) => g.length > 0);

  if (!hasItems && !currentUserRole) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          Действия <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {groups.map((group, gi) => (
          group.length > 0 && (
            <div key={gi}>
              {gi > 0 && <DropdownMenuSeparator />}
              {group.map((item) => (
                <DropdownMenuItem
                  key={item.action}
                  onClick={() => onAction(item.action, item.payload)}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </div>
          )
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateSubtask}>
          Создать подчинённую задачу
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
