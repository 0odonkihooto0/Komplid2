'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { TaskDetail } from './useTaskDetail';
import type { TaskRoleType } from './useGlobalTasks';

interface Employee { id: string; firstName: string; lastName: string; position: string | null }

const PRIORITY_LABELS = { LOW: 'Низкий', MEDIUM: 'Средний', HIGH: 'Высокий', CRITICAL: 'Критичный' };

function UserChip({
  user, role, currentUserRole, taskAuthorId, onRemove,
}: {
  user: { id: string; firstName: string; lastName: string };
  role: TaskRoleType;
  currentUserRole: TaskRoleType | null;
  taskAuthorId: string;
  onRemove: (userId: string, role: TaskRoleType) => void;
}) {
  const canRemove =
    currentUserRole === 'AUTHOR' ||
    (currentUserRole === 'CONTROLLER' && role !== 'AUTHOR') ||
    (currentUserRole === 'EXECUTOR' && (role === 'OBSERVER' || user.id === taskAuthorId)) ||
    (currentUserRole === 'OBSERVER' && role === 'OBSERVER');

  return (
    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
      <Avatar className="h-4 w-4">
        <AvatarFallback className="text-[8px]">{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
      </Avatar>
      {user.firstName} {user.lastName}
      {canRemove && (
        <button onClick={() => onRemove(user.id, role)} className="ml-0.5 text-gray-400 hover:text-gray-700">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function AddUserPopover({
  role, taskId: _taskId, existingIds, onAdd,
}: {
  role: TaskRoleType;
  taskId: string;
  existingIds: string[];
  onAdd: (userId: string, role: TaskRoleType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      return (json.success ? json.data : []) as Employee[];
    },
    staleTime: 60_000,
    enabled: open,
  });

  const filtered = employees.filter(
    (e) => !existingIds.includes(e.id) &&
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800">
          <Plus className="h-3 w-3" /> Добавить
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <Input
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-7 text-xs"
        />
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {filtered.map((emp) => (
            <button
              key={emp.id}
              className="w-full rounded px-2 py-1 text-left text-xs hover:bg-gray-100"
              onClick={() => { onAdd(emp.id, role); setOpen(false); setSearch(''); }}
            >
              {emp.firstName} {emp.lastName}
              {emp.position && <span className="ml-1 text-gray-400">{emp.position}</span>}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-2 py-1 text-xs text-gray-400">Не найдено</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  task: TaskDetail;
  currentUserRole: TaskRoleType | null;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function TaskDetailSidebar({ task, currentUserRole, onUpdate }: Props) {
  const canEditDates = currentUserRole === 'AUTHOR' || currentUserRole === 'CONTROLLER';

  const authorRoles = task.roles.filter((r) => r.role === 'AUTHOR');
  const controllerRoles = task.roles.filter((r) => r.role === 'CONTROLLER');
  const executorRoles = task.roles.filter((r) => r.role === 'EXECUTOR');
  const observerRoles = task.roles.filter((r) => r.role === 'OBSERVER');

  const allParticipantIds = task.roles.map((r) => r.user.id);

  function handleAddUser(userId: string, role: TaskRoleType) {
    const key = role === 'EXECUTOR' ? 'addExecutors' : role === 'CONTROLLER' ? 'addControllers' : 'addObservers';
    onUpdate({ [key]: [userId] });
  }

  function handleRemoveUser(userId: string, role: TaskRoleType) {
    const key = role === 'EXECUTOR' ? 'removeExecutors' : role === 'CONTROLLER' ? 'removeControllers' : 'removeObservers';
    onUpdate({ [key]: [userId] });
  }

  function formatDate(iso: string | null) {
    if (!iso) return '';
    return new Date(iso).toISOString().slice(0, 10);
  }

  function renderSection(label: string, roles: typeof authorRoles, role: TaskRoleType, canAdd: boolean) {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">{label}</span>
          {canAdd && role !== 'AUTHOR' && (
            <AddUserPopover
              role={role}
              taskId={task.id}
              existingIds={[...allParticipantIds]}
              onAdd={handleAddUser}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {roles.length === 0
            ? <span className="text-xs text-gray-400">Не назначен</span>
            : roles.map(({ user }) => (
              <UserChip
                key={user.id}
                user={user}
                role={role}
                currentUserRole={currentUserRole}
                taskAuthorId={task.createdBy.id}
                onRemove={handleRemoveUser}
              />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l px-4 py-4 text-sm">
      {/* Сроки */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Сроки</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500">Начало исполнения</label>
            <Input
              type="date"
              value={formatDate(task.plannedStartDate)}
              disabled={!canEditDates}
              onChange={(e) => onUpdate({ plannedStartDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-0.5 h-7 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Срок исполнения</label>
            <Input
              type="date"
              value={formatDate(task.deadline)}
              disabled={!canEditDates}
              onChange={(e) => onUpdate({ deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-0.5 h-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Участники */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Участники</p>
        <div className="space-y-3">
          {renderSection('Автор', authorRoles, 'AUTHOR', false)}
          {renderSection('Контролёры', controllerRoles, 'CONTROLLER', currentUserRole === 'AUTHOR' || currentUserRole === 'CONTROLLER')}
          {renderSection('Исполнители', executorRoles, 'EXECUTOR', currentUserRole === 'AUTHOR' || currentUserRole === 'EXECUTOR')}
          {renderSection('Наблюдатели', observerRoles, 'OBSERVER', true)}
        </div>
      </div>

      {/* Остальное */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Информация</p>
        <div className="space-y-1.5">
          {task.taskType && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Тип</span>
              <span className="text-xs">{task.taskType.name}</span>
            </div>
          )}
          {task.group && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Группа</span>
              <span className="text-xs">{task.group.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Приоритет</span>
            <span className="text-xs">{PRIORITY_LABELS[task.priority]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Создана</span>
            <span className="text-xs">{new Date(task.createdAt).toLocaleDateString('ru-RU')}</span>
          </div>
          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.labels.map(({ label }) => (
                <span
                  key={label.id}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
