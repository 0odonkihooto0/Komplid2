'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlannerTask } from './usePlannerTasks';

interface Props {
  task: PlannerTask;
  depth: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onEdit: (task: PlannerTask) => void;
  onDelete: (task: PlannerTask) => void;
}

// Конфигурация визуального отображения приоритетов
const PRIORITY_CONFIG = {
  LOW:      { label: 'Низкий',    className: 'bg-gray-100 text-gray-700' },
  MEDIUM:   { label: 'Средний',   className: 'bg-blue-100 text-blue-700' },
  HIGH:     { label: 'Высокий',   className: 'bg-orange-100 text-orange-700' },
  CRITICAL: { label: 'Критичный', className: 'bg-red-100 text-red-700' },
} as const;

// Конфигурация визуального отображения статусов
const STATUS_CONFIG = {
  OPEN:        { label: 'Открыта',   className: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: 'В работе',  className: 'bg-yellow-100 text-yellow-700' },
  DONE:        { label: 'Выполнена', className: 'bg-green-100 text-green-700' },
  CANCELLED:   { label: 'Отменена',  className: 'bg-red-100 text-red-600' },
} as const;

export function PlannerTaskRow({ task, depth, isExpanded, onToggle, onCreateChild, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 hover:bg-gray-50 group"
    >
      {/* Ручка перетаскивания — видна только при наведении */}
      <button
        {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 flex-shrink-0"
        aria-label="Перетащить задачу"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Отступ по уровню вложенности + кнопка раскрытия дочерних задач */}
      <div style={{ paddingLeft: depth * 20 }} className="flex items-center gap-1 flex-shrink-0">
        {task._count.childTasks > 0 ? (
          <button
            onClick={() => onToggle(task.id)}
            className="text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center"
            aria-label={isExpanded ? 'Свернуть подзадачи' : 'Развернуть подзадачи'}
          >
            {isExpanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-5 h-5" /> /* placeholder для выравнивания строк без дочерних задач */
        )}
      </div>

      {/* Название задачи — занимает всё доступное пространство */}
      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{task.title}</span>

      <Badge variant="outline" className={cn('text-xs px-1.5 py-0 flex-shrink-0', PRIORITY_CONFIG[task.priority].className)}>
        {PRIORITY_CONFIG[task.priority].label}
      </Badge>

      <Badge variant="outline" className={cn('text-xs px-1.5 py-0 flex-shrink-0', STATUS_CONFIG[task.status].className)}>
        {STATUS_CONFIG[task.status].label}
      </Badge>

      {/* Ответственный — сокращённый формат «Имя Ф.» */}
      {task.assignee && (
        <span className="text-xs text-gray-500 flex-shrink-0">
          {task.assignee.firstName} {task.assignee.lastName.charAt(0)}.
        </span>
      )}

      {/* Срок в формате дд.мм */}
      {task.deadline && (
        <span className="text-xs text-gray-500 flex-shrink-0">
          {new Date(task.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
        </span>
      )}

      {/* Контекстное меню задачи */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(task)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Редактировать
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreateChild(task.id)}>
            <Plus className="mr-2 h-3.5 w-3.5" /> Добавить подзадачу
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
