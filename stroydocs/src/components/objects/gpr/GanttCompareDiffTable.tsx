'use client';

import { differenceInDays, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { CompareResult } from './useGanttCompare';
import type { GanttTask } from '@prisma/client';

interface Props {
  result: CompareResult;
}

// ── Вспомогательные функции ────────────────────────────────────────────────────

function fmtDate(d: Date | string | null): string {
  if (!d) return '—';
  return format(new Date(d), 'dd.MM.yyyy', { locale: ru });
}

function fmtAmount(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}

function fmtDelta(n: number): string {
  if (n === 0) return '—';
  return n > 0 ? `+${n}` : String(n);
}

function fmtAmountDelta(v1: number | null | undefined, v2: number | null | undefined): string {
  const a = v1 ?? 0;
  const b = v2 ?? 0;
  const delta = b - a;
  if (delta === 0) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('ru-RU').format(Math.round(delta))}`;
}

// ── Расчёт итогов ─────────────────────────────────────────────────────────────

function calcSummary(result: CompareResult) {
  const { added, removed, changed, unchanged } = result.diff;

  let v1Total = 0;
  let v2Total = 0;
  const v1Dates: Date[] = [];
  const v2Dates: Date[] = [];

  for (const t of removed) {
    v1Total += t.amount ?? 0;
    v1Dates.push(new Date(t.planEnd));
  }
  for (const t of added) {
    v2Total += t.amount ?? 0;
    v2Dates.push(new Date(t.planEnd));
  }
  for (const { v1Task, v2Task } of changed) {
    v1Total += v1Task.amount ?? 0;
    v2Total += v2Task.amount ?? 0;
    v1Dates.push(new Date(v1Task.planEnd));
    v2Dates.push(new Date(v2Task.planEnd));
  }
  for (const t of unchanged) {
    v1Total += t.amount ?? 0;
    v2Total += t.amount ?? 0;
    v1Dates.push(new Date(t.planEnd));
    v2Dates.push(new Date(t.planEnd));
  }

  const maxV1 = v1Dates.length > 0 ? new Date(Math.max(...v1Dates.map((d) => d.getTime()))) : null;
  const maxV2 = v2Dates.length > 0 ? new Date(Math.max(...v2Dates.map((d) => d.getTime()))) : null;
  const daysDelta = maxV1 && maxV2 ? differenceInDays(maxV2, maxV1) : 0;

  return { v1Total, v2Total, daysDelta };
}

// ── Строки таблицы ────────────────────────────────────────────────────────────

function AddedRow({ task }: { task: GanttTask }) {
  return (
    <TableRow className="bg-green-50 hover:bg-green-100">
      <TableCell className="font-medium text-green-800">[+] {task.name}</TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell>{fmtDate(task.planStart)}</TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell className="text-green-700">{fmtAmount(task.amount)}</TableCell>
      <TableCell className="text-green-700">+{fmtAmount(task.amount)}</TableCell>
    </TableRow>
  );
}

function RemovedRow({ task }: { task: GanttTask }) {
  return (
    <TableRow className="bg-red-50 hover:bg-red-100">
      <TableCell className="font-medium text-red-800">[-] {task.name}</TableCell>
      <TableCell>{fmtDate(task.planStart)}</TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell className="text-red-700">{fmtAmount(task.amount)}</TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell className="text-red-700">-{fmtAmount(task.amount)}</TableCell>
    </TableRow>
  );
}

function ChangedRow({ v1Task, v2Task }: { v1Task: GanttTask; v2Task: GanttTask }) {
  const daysDelta = differenceInDays(new Date(v2Task.planStart), new Date(v1Task.planStart));
  return (
    <TableRow className="bg-yellow-50 hover:bg-yellow-100">
      <TableCell className="font-medium text-yellow-800">[~] {v1Task.name}</TableCell>
      <TableCell>{fmtDate(v1Task.planStart)}</TableCell>
      <TableCell>{fmtDate(v2Task.planStart)}</TableCell>
      <TableCell className={daysDelta !== 0 ? 'font-medium' : ''}>{fmtDelta(daysDelta)}</TableCell>
      <TableCell>{fmtAmount(v1Task.amount)}</TableCell>
      <TableCell>{fmtAmount(v2Task.amount)}</TableCell>
      <TableCell className={v2Task.amount !== v1Task.amount ? 'font-medium' : ''}>
        {fmtAmountDelta(v1Task.amount, v2Task.amount)}
      </TableCell>
    </TableRow>
  );
}

// ── Основной компонент ────────────────────────────────────────────────────────

export function GanttCompareDiffTable({ result }: Props) {
  const { added, removed, changed } = result.diff;
  const { v1Total, v2Total, daysDelta } = calcSummary(result);
  const totalDelta = v2Total - v1Total;
  const daysDeltaLabel = daysDelta === 0
    ? 'Длительность не изменилась'
    : daysDelta > 0
      ? `V2 длиннее на ${daysDelta} дн.`
      : `V2 короче на ${Math.abs(daysDelta)} дн.`;

  return (
    <div className="space-y-3">
      {/* Итоговая строка-шапка */}
      <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <span><span className="text-muted-foreground">{result.v1.name}:</span> {fmtAmount(v1Total)} ₽</span>
        <span><span className="text-muted-foreground">{result.v2.name}:</span> {fmtAmount(v2Total)} ₽</span>
        <span className={totalDelta >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
          Δ {totalDelta >= 0 ? '+' : ''}{fmtAmount(totalDelta)} ₽
        </span>
        <span className="text-muted-foreground">{daysDeltaLabel}</span>
      </div>

      {/* Таблица diff */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Задача</TableHead>
            <TableHead>V1 план начало</TableHead>
            <TableHead>V2 план начало</TableHead>
            <TableHead>Δ дней</TableHead>
            <TableHead>V1 сумма, ₽</TableHead>
            <TableHead>V2 сумма, ₽</TableHead>
            <TableHead>Δ сумма, ₽</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {added.map((t) => <AddedRow key={t.id} task={t} />)}
          {removed.map((t) => <RemovedRow key={t.id} task={t} />)}
          {changed.map(({ v1Task, v2Task }) => (
            <ChangedRow key={v1Task.id} v1Task={v1Task} v2Task={v2Task} />
          ))}
          {added.length === 0 && removed.length === 0 && changed.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Версии идентичны — изменений не обнаружено
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Легенда */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-100 border border-green-300" />
          Добавлено ({added.length})
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-100 border border-red-300" />
          Удалено ({removed.length})
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-100 border border-yellow-300" />
          Изменено ({changed.length})
        </span>
      </div>
    </div>
  );
}
