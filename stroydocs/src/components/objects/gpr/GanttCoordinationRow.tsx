'use client';

import { useState } from 'react';
import { MoreVertical, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';

// Буква типа стоимости для колонки «Индикаторы»
const COST_TYPE_LETTER: Record<string, string> = {
  CONSTRUCTION: 'С',
  MOUNTING: 'М',
  EQUIPMENT: 'О',
  OTHER: 'П',
};

interface Props {
  task: GanttTaskItem;
  onUpdate: (taskId: string, field: string, value: string) => void;
  onEdit?: (task: GanttTaskItem) => void;
  onEditFiles?: (task: GanttTaskItem) => void;
  onAddChild?: (parentId: string) => void;
  onAddBelow?: (task: GanttTaskItem) => void;
  onMoveUp?: (taskId: string) => void;
  onMoveDown?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onMilestone?: (taskId: string) => void;
  onIsolate?: (taskId: string) => void;
  onCopy?: (task: GanttTaskItem) => void;
  onEstimatePreview?: (task: GanttTaskItem) => void;
  // Множественный выбор
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (id: string) => void;
  // Развёртка/свёртка
  hasChildren?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  // Контекстное меню иконки раздела
  onContextMenuOpen?: (e: React.MouseEvent, taskId: string) => void;
}

// Вычисляем количество дней между двумя ISO-датами (включительно)
function calcDays(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  return diff >= 0 ? String(diff + 1) : '—';
}

function fmt(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function GanttCoordinationRow({
  task,
  onUpdate,
  onEdit,
  onEditFiles,
  onAddChild,
  onAddBelow,
  onMoveUp,
  onMoveDown,
  onDelete,
  onMilestone,
  onIsolate,
  onCopy,
  onEstimatePreview,
  isMultiSelectMode,
  isSelected,
  onSelectToggle,
  hasChildren,
  isCollapsed,
  onToggleCollapse,
  onContextMenuOpen,
}: Props) {
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  function startEdit(field: string, current: string | null) {
    setEditField(field);
    setEditValue(current ?? '');
  }

  function commitEdit() {
    if (editField && editValue) {
      onUpdate(task.id, editField, editValue);
    }
    setEditField(null);
  }

  function dateCell(field: 'planStart' | 'planEnd' | 'factStart' | 'factEnd') {
    const raw = task[field];
    if (editField === field) {
      return (
        <Input
          type="date"
          className="h-6 text-xs w-28 p-1"
          value={editValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          autoFocus
        />
      );
    }
    return (
      <span
        className="cursor-pointer hover:underline text-xs"
        onClick={() => startEdit(field, raw ? raw.slice(0, 10) : '')}
      >
        {fmt(raw)}
      </span>
    );
  }

  const indent = task.level * 16;
  const isSection = task.level === 0;

  return (
    <TableRow
      className={`text-xs ${isSelected ? 'bg-primary/5' : ''}`}
    >
      {/* Чекбокс в режиме множественного редактирования */}
      {isMultiSelectMode && (
        <TableCell className="w-8 pr-0">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 cursor-pointer"
            checked={isSelected ?? false}
            onChange={() => onSelectToggle?.(task.id)}
          />
        </TableCell>
      )}

      {/* Наименование + иконки + меню */}
      <TableCell style={{ paddingLeft: `${indent + 4}px` }} className="max-w-56">
        <div className="flex items-center gap-1">
          {/* Кнопка expand/collapse (только для задач с детьми) */}
          {hasChildren ? (
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onToggleCollapse?.(task.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenuOpen?.(e, task.id);
              }}
              aria-label={isCollapsed ? 'Раскрыть' : 'Свернуть'}
            >
              {isSection ? (
                isCollapsed
                  ? <Folder className="h-3.5 w-3.5 text-amber-500" />
                  : <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                isCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            /* Пустой placeholder для сохранения отступа */
            <span className="shrink-0 w-3.5" />
          )}

          {/* Контекстное меню (⋮) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Действия"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              {/* Структура */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">Структура</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="text-xs">
                  <DropdownMenuItem onClick={() => onAddChild?.(task.id)}>
                    Добавить подчинённый
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddBelow?.(task)}>
                    Добавить ниже
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onMoveUp?.(task.id)}>
                    Сдвинуть выше
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveDown?.(task.id)}>
                    Сдвинуть ниже
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onIsolate?.(task.id)}>
                Изолировать
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditFiles?.(task)}>
                Прикрепить файл
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopy?.(task)}>
                Скопировать
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(task)}>
                Редактировать
              </DropdownMenuItem>
              {task.estimateItemId && (
                <DropdownMenuItem onClick={() => onEstimatePreview?.(task)}>
                  Показать изменения сметы
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onMilestone?.(task.id)}>
                Сделать вехой
              </DropdownMenuItem>
              {/* Календарь */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">Календарь</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="text-xs">
                  <DropdownMenuItem disabled>
                    Из шаблона (скоро)
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    Создать новый (скоро)
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(task.id)}
              >
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="truncate">{task.name}</span>
        </div>
        {/* Комментарий под названием */}
        {task.comment && (
          <p className="mt-0.5 text-[10px] text-muted-foreground truncate pl-6">
            {task.comment}
          </p>
        )}
      </TableCell>

      {/* Индикаторы */}
      <TableCell>
        <div className="flex flex-wrap gap-0.5 items-center">
          {task.costType && COST_TYPE_LETTER[task.costType] && (
            <span
              className="font-bold text-[11px] text-primary leading-none"
              title={`Тип: ${task.costType}`}
            >
              {COST_TYPE_LETTER[task.costType]}
            </span>
          )}
          {task.basis && (
            <span title="Есть основание (смета)" className="text-[11px] leading-none">🏛</span>
          )}
          {task.isMilestone && (
            <span title="Веха" className="text-[11px] leading-none text-amber-500">♦</span>
          )}
          {task.isCritical && (
            <span title="Критический путь" className="text-[11px] leading-none text-destructive">⚠</span>
          )}
          {task.taskContractId && (
            <span title="Привязан контракт задачи" className="text-[11px] leading-none">📋</span>
          )}
          {task.calendarType === 'CUSTOM' && (
            <span title="Рабочий календарь (custom)" className="text-[11px] leading-none">📅</span>
          )}
          {task.linkedExecutionDocsCount > 0 && (
            <span
              className="text-[9px] bg-muted rounded px-0.5 text-muted-foreground"
              title="Связанных ИД"
            >
              {task.linkedExecutionDocsCount} ИД
            </span>
          )}
        </div>
      </TableCell>

      {/* Плановый физ. объём */}
      <TableCell className="text-right">
        {task.volume != null ? task.volume : '—'}
      </TableCell>
      {/* Единицы */}
      <TableCell>{task.volumeUnit ?? '—'}</TableCell>
      {/* Сумма */}
      <TableCell className="text-right">
        {task.amount != null ? task.amount.toLocaleString('ru-RU') : '—'}
      </TableCell>
      {/* Плановые даты */}
      <TableCell>{dateCell('planStart')}</TableCell>
      <TableCell>{dateCell('planEnd')}</TableCell>
      <TableCell className="text-right">{calcDays(task.planStart, task.planEnd)}</TableCell>
      {/* Плановый объём — TODO: factVolume требует Prisma-миграции */}
      <TableCell className="text-right">—</TableCell>
      {/* Фактические даты */}
      <TableCell>{dateCell('factStart')}</TableCell>
      <TableCell>{dateCell('factEnd')}</TableCell>
      <TableCell className="text-right">{calcDays(task.factStart, task.factEnd)}</TableCell>
      {/* Фактический объём — TODO: factVolume требует Prisma-миграции */}
      <TableCell className="text-right">—</TableCell>
    </TableRow>
  );
}
