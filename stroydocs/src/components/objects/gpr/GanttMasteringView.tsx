'use client';

import { useState } from 'react';
import { FileDown, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGanttStages, useGanttVersionsByProject } from './useGanttStructure';
import { useGanttMastering, type MasteringMonth } from './useGanttMastering';

// ── Вспомогательные функции ────────────────────────────────────────────────────

const RU_MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

/** Преобразует "2025-01" → "Янв 2025" */
function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${RU_MONTHS[Number(m) - 1]} ${year}`;
}

/** Форматирует сумму в рублях */
function formatRub(value: number): string {
  return value.toLocaleString('ru-RU') + ' ₽';
}

/** Цветовой класс для процента выполнения */
function pctClass(pct: number | null): string {
  if (pct === null) return 'text-muted-foreground';
  if (pct < 90) return 'text-red-600 font-semibold';
  if (pct <= 110) return 'text-green-600 font-semibold';
  return 'text-yellow-600 font-semibold';
}

/** Вычисляет процент факта от плана */
function calcPct(plan: number, fact: number): number | null {
  if (plan === 0) return null;
  return Math.round((fact / plan) * 100);
}

// ── Строка таблицы ─────────────────────────────────────────────────────────────

function MasteringRow({ row }: { row: MasteringMonth }) {
  const deviation = row.factAmount - row.planAmount;
  const pct = calcPct(row.planAmount, row.factAmount);
  return (
    <TableRow>
      <TableCell>{formatMonthLabel(row.month)}</TableCell>
      <TableCell className="text-right">{formatRub(row.planAmount)}</TableCell>
      <TableCell className="text-right">{formatRub(row.factAmount)}</TableCell>
      <TableCell className={`text-right ${deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {deviation >= 0 ? '+' : ''}{formatRub(deviation)}
      </TableCell>
      <TableCell className={`text-right ${pctClass(pct)}`}>
        {pct !== null ? `${pct}%` : '—'}
      </TableCell>
    </TableRow>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────────

interface Props {
  objectId: string;
}

export function GanttMasteringView({ objectId }: Props) {
  const currentYear = new Date().getFullYear();

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [year, setYear] = useState<number>(currentYear);

  // Данные стадий и версий
  const { stages, isLoading: stagesLoading } = useGanttStages(objectId);
  const { versions, isLoading: versionsLoading } = useGanttVersionsByProject(objectId, selectedStageId);

  // Данные плана освоения
  const { data, isLoading: masteringLoading } = useGanttMastering(objectId, selectedVersionId, year);

  // Список годов для селектора (текущий ±3 года)
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  function handleExportExcel() {
    if (!selectedVersionId) return;
    window.open(
      `/api/objects/${objectId}/gantt-versions/${selectedVersionId}/mastering/export?year=${year}`,
      '_blank',
    );
  }

  const isLoading = stagesLoading || versionsLoading;
  const totalDeviation = (data?.totalFact ?? 0) - (data?.totalPlan ?? 0);
  const totalPct = calcPct(data?.totalPlan ?? 0, data?.totalFact ?? 0);

  return (
    <div className="space-y-4">
      {/* ── Панель управления ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Стадия */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Стадия</Label>
          {stagesLoading ? (
            <Skeleton className="h-9 w-36" />
          ) : (
            <Select
              value={selectedStageId ?? 'all'}
              onValueChange={(v) => { setSelectedStageId(v === 'all' ? null : v); setSelectedVersionId(null); }}
            >
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue placeholder="Все стадии" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все стадии</SelectItem>
                {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Версия ГПР */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Версия ГПР</Label>
          {versionsLoading ? (
            <Skeleton className="h-9 w-52" />
          ) : (
            <Select value={selectedVersionId ?? ''} onValueChange={(v) => setSelectedVersionId(v || null)}>
              <SelectTrigger className="h-9 w-52 text-sm">
                <SelectValue placeholder="Выберите версию" />
              </SelectTrigger>
              <SelectContent>
                {versions.length === 0 ? (
                  <SelectItem value="__PLACEHOLDER__" disabled>Нет версий</SelectItem>
                ) : (
                  versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.isDirective ? '📌 ' : ''}{v.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Год */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Год</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-9 w-24 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <Button variant="outline" size="sm" disabled={!selectedVersionId} onClick={handleExportExcel}>
          <FileDown className="mr-1 h-4 w-4" />
          Экспорт в Excel
        </Button>
        <Button variant="outline" size="sm" disabled={!selectedVersionId} onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" />
          Печатная форма
        </Button>
      </div>

      {/* ── Таблица ───────────────────────────────────────────────────────── */}
      {!selectedVersionId ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Выберите версию ГПР для отображения плана освоения.
        </div>
      ) : isLoading || masteringLoading ? (
        <div className="space-y-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Месяц</TableHead>
              <TableHead className="text-right">План (руб.)</TableHead>
              <TableHead className="text-right">Факт КС-2 (руб.)</TableHead>
              <TableHead className="text-right">Отклонение</TableHead>
              <TableHead className="text-right">% выполнения</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.months ?? []).map((row) => <MasteringRow key={row.month} row={row} />)}
            {/* Итоговая строка */}
            <TableRow className="font-semibold border-t-2">
              <TableCell>Итого {year}</TableCell>
              <TableCell className="text-right">{formatRub(data?.totalPlan ?? 0)}</TableCell>
              <TableCell className="text-right">{formatRub(data?.totalFact ?? 0)}</TableCell>
              <TableCell className={`text-right ${totalDeviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalDeviation >= 0 ? '+' : ''}{formatRub(totalDeviation)}
              </TableCell>
              <TableCell className={`text-right ${pctClass(totalPct)}`}>
                {totalPct !== null ? `${totalPct}%` : '—'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
}
