'use client';

import { Badge } from '@/components/ui/badge';
import type { VersionCompareResult, EstimateItemSnapshot, ChangedItem } from '@/hooks/useEstimateCompare';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtNum = (v: number | null) =>
  v !== null ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v) : '—';

const fmtRub = (v: number | null) =>
  v !== null
    ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v)
    : '—';

// ─── Ячейка с подсветкой изменённого значения ─────────────────────────────────

function DiffCell({
  v1,
  v2,
  isChanged,
  format,
}: {
  v1: number | null;
  v2: number | null;
  isChanged: boolean;
  format: (v: number | null) => string;
}) {
  if (!isChanged) {
    return <td className="px-3 py-2 text-right tabular-nums">{format(v2)}</td>;
  }
  return (
    <td className="px-3 py-2 text-right tabular-nums bg-yellow-100 dark:bg-yellow-900/20">
      <span className="flex flex-col items-end gap-0.5">
        <span className="line-through text-muted-foreground text-xs">{format(v1)}</span>
        <span>{format(v2)}</span>
      </span>
    </td>
  );
}

// ─── Строки таблицы по типу изменения ────────────────────────────────────────

function AddedRow({ item }: { item: EstimateItemSnapshot }) {
  return (
    <tr className="border-b bg-green-50 dark:bg-green-950/20">
      <td className="px-3 py-2">
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0">
          + Добавлено
        </Badge>
      </td>
      <td className="px-3 py-2 font-medium">{item.name}</td>
      <td className="px-3 py-2 text-muted-foreground">{item.unit ?? '—'}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtNum(item.volume)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtRub(item.unitPrice)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtRub(item.totalPrice)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtRub(item.laborCost)}</td>
    </tr>
  );
}

function RemovedRow({ item }: { item: EstimateItemSnapshot }) {
  return (
    <tr className="border-b bg-red-50 dark:bg-red-950/20 opacity-75">
      <td className="px-3 py-2">
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0">
          − Удалено
        </Badge>
      </td>
      <td className="px-3 py-2 font-medium line-through text-muted-foreground">{item.name}</td>
      <td className="px-3 py-2 text-muted-foreground">{item.unit ?? '—'}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtNum(item.volume)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtRub(item.unitPrice)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtRub(item.totalPrice)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtRub(item.laborCost)}</td>
    </tr>
  );
}

function ChangedRow({ entry }: { entry: ChangedItem }) {
  const { item1, item2, changedFields } = entry;
  const has = (f: string) => changedFields.includes(f);
  return (
    <tr className="border-b bg-yellow-50 dark:bg-yellow-950/20">
      <td className="px-3 py-2">
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-0">
          ~ Изменено
        </Badge>
      </td>
      <td className="px-3 py-2 font-medium">{item2.name}</td>
      <td className="px-3 py-2 text-muted-foreground">{item2.unit ?? '—'}</td>
      <DiffCell v1={item1.volume}       v2={item2.volume}       isChanged={has('volume')}       format={fmtNum} />
      <DiffCell v1={item1.unitPrice}    v2={item2.unitPrice}    isChanged={has('unitPrice')}    format={fmtRub} />
      <DiffCell v1={item1.totalPrice}   v2={item2.totalPrice}   isChanged={has('totalPrice')}   format={fmtRub} />
      <DiffCell v1={item1.laborCost}    v2={item2.laborCost}    isChanged={has('laborCost')}    format={fmtRub} />
    </tr>
  );
}

function UnchangedRow({ item }: { item: EstimateItemSnapshot }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-3 py-2">
        <Badge variant="outline" className="text-xs">= Без изменений</Badge>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{item.name}</td>
      <td className="px-3 py-2 text-muted-foreground">{item.unit ?? '—'}</td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtNum(item.volume)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtRub(item.unitPrice)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtRub(item.totalPrice)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtRub(item.laborCost)}</td>
    </tr>
  );
}

// ─── Основной компонент ───────────────────────────────────────────────────────

interface Props {
  result: VersionCompareResult;
}

/** Таблица диффа двух версий смет — ШАГ 8 */
export function EstimateCompareDiffTable({ result }: Props) {
  const { diff } = result;
  const total = diff.added.length + diff.removed.length + diff.changed.length + diff.unchanged.length;

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left w-36">Статус</th>
            <th className="px-3 py-2 text-left">Наименование</th>
            <th className="px-3 py-2 text-left w-16">Ед.</th>
            <th className="px-3 py-2 text-right w-24">Объём</th>
            <th className="px-3 py-2 text-right w-28">Цена ед.</th>
            <th className="px-3 py-2 text-right w-28">Итого, ₽</th>
            <th className="px-3 py-2 text-right w-28">ФОТ</th>
          </tr>
        </thead>
        <tbody>
          {diff.added.map((item) => <AddedRow key={item.id} item={item} />)}
          {diff.removed.map((item) => <RemovedRow key={item.id} item={item} />)}
          {diff.changed.map((entry) => <ChangedRow key={entry.item2.id} entry={entry} />)}
          {diff.unchanged.map((item) => <UnchangedRow key={item.id} item={item} />)}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/30 text-xs text-muted-foreground">
            <td colSpan={7} className="px-3 py-2">
              Всего: {total} позиций — добавлено: {diff.added.length}, удалено: {diff.removed.length}, изменено: {diff.changed.length}, без изменений: {diff.unchanged.length}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
