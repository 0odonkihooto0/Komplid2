'use client';

import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';

interface Props {
  task: GanttTaskItem;
  onUpdate: (taskId: string, field: string, value: string) => void;
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

export function GanttCoordinationRow({ task, onUpdate }: Props) {
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
          onChange={(e: { target: { value: string } }) => setEditValue(e.target.value)}
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

  return (
    <TableRow className="text-xs">
      {/* Наименование */}
      <TableCell style={{ paddingLeft: `${indent + 8}px` }} className="max-w-56 truncate">
        {task.name}
      </TableCell>
      {/* Индикаторы */}
      <TableCell>
        <div className="flex gap-1">
          {task.isCritical && <Badge variant="destructive" className="text-[9px] px-1 py-0">КП</Badge>}
          {task.linkedExecutionDocsCount > 0 && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0">{task.linkedExecutionDocsCount} ИД</Badge>
          )}
        </div>
      </TableCell>
      {/* Плановый физ. объём */}
      <TableCell className="text-right">—</TableCell>
      {/* Единицы */}
      <TableCell>—</TableCell>
      {/* Сумма */}
      <TableCell className="text-right">—</TableCell>
      {/* Плановые даты */}
      <TableCell>{dateCell('planStart')}</TableCell>
      <TableCell>{dateCell('planEnd')}</TableCell>
      <TableCell className="text-right">{calcDays(task.planStart, task.planEnd)}</TableCell>
      {/* Плановый объём */}
      <TableCell className="text-right">—</TableCell>
      {/* Фактические даты */}
      <TableCell>{dateCell('factStart')}</TableCell>
      <TableCell>{dateCell('factEnd')}</TableCell>
      <TableCell className="text-right">{calcDays(task.factStart, task.factEnd)}</TableCell>
      {/* Фактический объём — TODO: поле factVolume требует Prisma-миграции */}
      <TableCell className="text-right">—</TableCell>
    </TableRow>
  );
}
