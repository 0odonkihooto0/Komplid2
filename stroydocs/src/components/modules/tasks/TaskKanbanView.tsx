'use client';

import { useState, useRef } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { MessageSquare, CheckSquare, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/useToast';
import { type GlobalTask, type TaskStatus, type TaskPriority } from './useGlobalTasks';
import { useTaskKanban, getTransition, canUserDoTransition } from './useTaskKanban';

const COLUMNS: Array<{ status: TaskStatus; label: string; color: string }> = [
  { status: 'OPEN', label: 'Новая', color: 'bg-gray-100' },
  { status: 'PLANNED', label: 'Запланирована', color: 'bg-sky-50' },
  { status: 'IN_PROGRESS', label: 'В работе', color: 'bg-blue-50' },
  { status: 'UNDER_REVIEW', label: 'На проверке', color: 'bg-purple-50' },
  { status: 'REVISION', label: 'На доработке', color: 'bg-orange-50' },
  { status: 'DONE', label: 'Выполнена', color: 'bg-green-50' },
  { status: 'IRRELEVANT', label: 'Неактуальная', color: 'bg-gray-50' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-400', MEDIUM: 'bg-yellow-500', HIGH: 'bg-orange-500', CRITICAL: 'bg-red-600',
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function KanbanCard({ task }: { task: GlobalTask }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });
  const executors = task.roles.filter((r) => r.role === 'EXECUTOR').slice(0, 3);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'cursor-grab rounded-lg border bg-white p-3 shadow-sm select-none',
        isDragging && 'opacity-40',
      )}
    >
      <div className="mb-1 flex items-start gap-2">
        <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', PRIORITY_COLORS[task.priority])} />
        <span className="text-sm font-medium leading-snug text-gray-800">{task.title}</span>
      </div>

      {task.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map(({ label }) => (
            <span
              key={label.id}
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {task.deadline && (
          <span className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-medium',
            new Date(task.deadline) < new Date()
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600',
          )}>
            {formatDate(task.deadline)}
          </span>
        )}
        <div className="flex-1" />
        {executors.length > 0 && (
          <div className="flex -space-x-1">
            {executors.map(({ user }) => (
              <Avatar key={user.id} className="h-5 w-5 border border-white">
                <AvatarFallback className="text-[9px]">{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
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
      </div>
    </div>
  );
}

function KanbanColumn({
  status, label, color, tasks, onQuickCreate,
}: {
  status: TaskStatus; label: string; color: string;
  tasks: GlobalTask[]; onQuickCreate: (status: TaskStatus, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleStartCreate() {
    setCreating(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleCreate() {
    const t = title.trim();
    if (t) { onQuickCreate(status, t); }
    setTitle('');
    setCreating(false);
  }

  return (
    <div className={cn('flex w-64 shrink-0 flex-col rounded-lg', color)}>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
        <span className="text-xs text-gray-400">{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn('flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2', isOver && 'ring-2 ring-blue-300 ring-inset rounded-b-lg')}
        style={{ minHeight: 80 }}
      >
        {tasks.map((t) => <KanbanCard key={t.id} task={t} />)}
      </div>

      <div className="px-2 pb-2">
        {creating ? (
          <div className="rounded border bg-white p-2 shadow-sm">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setTitle(''); } }}
              onBlur={handleCreate}
              placeholder="Название задачи..."
              className="w-full text-sm outline-none"
            />
          </div>
        ) : (
          <button
            onClick={handleStartCreate}
            className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-white/60 hover:text-gray-600"
          >
            <Plus className="h-3 w-3" /> Добавить задачу
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  currentUserId: string;
  grouping: string;
  groupId?: string | null;
  search?: string;
}

export function TaskKanbanView({ currentUserId, grouping, groupId, search }: Props) {
  const { tasks, isLoading, changeStatus } = useTaskKanban({ grouping, groupId, search });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const toStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === toStatus) return;

    const rule = getTransition(task.status, toStatus);
    if (!rule) {
      toast({ title: 'Переход недопустим', description: `Нельзя перенести задачу из «${task.status}» в «${toStatus}»`, variant: 'destructive' });
      return;
    }

    if (!canUserDoTransition(task, task.status, toStatus, currentUserId)) {
      const roleLabels: Record<string, string> = { EXECUTOR: 'Исполнитель', CONTROLLER: 'Контролёр', AUTHOR: 'Автор' };
      const needed = rule.roles.map((r) => roleLabels[r] ?? r).join(' или ');
      toast({ title: 'Недостаточно прав', description: `Этот переход может выполнить: ${needed}`, variant: 'destructive' });
      return;
    }

    try {
      await changeStatus({ taskId, action: rule.action });
    } catch (err) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось изменить статус', variant: 'destructive' });
    }
  }

  function handleQuickCreate(status: TaskStatus, title: string) {
    toast({ title: 'Подсказка', description: `Задача «${title}» — используйте кнопку «Создать» в тулбаре для полного заполнения.` });
    void status;
  }

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto p-4">
        {COLUMNS.map((c) => <Skeleton key={c.status} className="h-48 w-64 shrink-0 rounded-lg" />)}
      </div>
    );
  }

  const tasksByStatus = Object.fromEntries(
    COLUMNS.map((c) => [c.status, tasks.filter((t) => t.status === c.status)]),
  ) as Record<TaskStatus, GlobalTask[]>;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto p-4 h-full">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            tasks={tasksByStatus[col.status] ?? []}
            onQuickCreate={handleQuickCreate}
          />
        ))}
      </div>
    </DndContext>
  );
}
