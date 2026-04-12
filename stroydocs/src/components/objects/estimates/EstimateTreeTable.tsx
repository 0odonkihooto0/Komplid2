'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  type ColumnDef,
  type Row,
  type ExpandedState,
} from '@tanstack/react-table';
import type { EstimateChapterDetail, EstimateItemDetail } from '@/hooks/useEstimateTree';
import { EstimateTreeRow } from './EstimateTreeRow';

// ─── Дискриминированные строки дерева ────────────────────────────────────────

export type TreeRow =
  | { rowType: 'chapter'; id: string; data: EstimateChapterDetail; depth: number; subRows: TreeRow[] }
  | { rowType: 'item'; id: string; data: EstimateItemDetail; chapterId: string; depth: number; subRows: TreeRow[] };

/** Рекурсивная трансформация глав и позиций в плоское дерево для TanStack Table */
function buildTree(chapters: EstimateChapterDetail[], depth: number, search: string): TreeRow[] {
  const rows: TreeRow[] = [];
  for (const chapter of chapters) {
    const childRows = buildTree(chapter.children, depth + 1, search);
    const itemRows: TreeRow[] = chapter.items
      .filter((item) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return item.name.toLowerCase().includes(q) || (item.code ?? '').toLowerCase().includes(q);
      })
      .map((item) => ({
        rowType: 'item' as const,
        id: item.id,
        data: item,
        chapterId: chapter.id,
        depth: depth + 1,
        subRows: [],
      }));

    const subRows = [...itemRows, ...childRows];
    // Показывать раздел если в нём есть позиции или дочерние разделы (после фильтрации)
    if (subRows.length > 0 || !search) {
      rows.push({
        rowType: 'chapter',
        id: chapter.id,
        data: chapter,
        depth,
        subRows,
      });
    }
  }
  return rows;
}

// ─── Форматирование ──────────────────────────────────────────────────────────

const fmtNum = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v);

const fmtRub = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);

// ─── Определение колонок ─────────────────────────────────────────────────────

const columns: Array<ColumnDef<TreeRow, unknown>> = [
  {
    id: 'number',
    header: '№ п.п',
    size: 50,
    cell: ({ row }) => {
      const r = row.original;
      if (r.rowType === 'chapter') return r.data.code ?? '';
      return r.data.sortOrder ?? '';
    },
  },
  {
    id: 'code',
    header: 'Обоснование',
    size: 90,
    cell: ({ row }) => {
      const r = row.original;
      return r.rowType === 'item' ? (r.data.code ?? '—') : '';
    },
  },
  {
    id: 'name',
    header: 'Наименование работ и затрат',
    size: 300,
    // Рендер делегирован в EstimateTreeRow (с expand toggle для глав)
    cell: () => null,
  },
  {
    id: 'unit',
    header: 'Ед. изм.',
    size: 60,
    cell: ({ row }) => {
      const r = row.original;
      return r.rowType === 'item' ? (r.data.unit ?? '—') : '';
    },
  },
  {
    id: 'volumeUnit',
    header: 'Кол-во на ед.',
    size: 80,
    cell: ({ row }) => {
      const r = row.original;
      return r.rowType === 'item' ? fmtNum(r.data.volume) : '';
    },
  },
  {
    id: 'volumeCoef',
    header: 'Коэф.',
    size: 60,
    cell: ({ row }) => {
      const r = row.original;
      return r.rowType === 'item' ? fmtNum(r.data.priceIndex) : '';
    },
  },
  {
    id: 'volumeTotal',
    header: 'Кол-во всего',
    size: 80,
    cell: ({ row }) => {
      const r = row.original;
      if (r.rowType !== 'item') return '';
      const vol = r.data.volume ?? 0;
      const idx = r.data.priceIndex ?? 1;
      return fmtNum(vol * idx);
    },
  },
  {
    id: 'priceUnit',
    header: 'Цена на ед.',
    size: 90,
    cell: ({ row }) => {
      const r = row.original;
      return r.rowType === 'item' ? fmtNum(r.data.unitPrice) : '';
    },
  },
  {
    id: 'priceCoef',
    header: 'Коэф.',
    size: 60,
    cell: ({ row }) => {
      const r = row.original;
      if (r.rowType !== 'item') return '';
      const oh = r.data.overhead ?? 0;
      const pr = r.data.profit ?? 0;
      if (oh === 0 && pr === 0) return '—';
      return `НР ${fmtNum(oh)} СП ${fmtNum(pr)}`;
    },
  },
  {
    id: 'total',
    header: 'Итого',
    size: 100,
    cell: ({ row }) => {
      const r = row.original;
      if (r.rowType === 'chapter') return fmtRub(r.data.totalAmount);
      return fmtRub(r.data.totalPrice);
    },
  },
];

// ─── Компонент таблицы ───────────────────────────────────────────────────────

interface Props {
  chapters: EstimateChapterDetail[];
  editMode: boolean;
  search: string;
  readOnly: boolean;
  projectId: string;
  contractId: string;
  versionId: string;
  onEditItem: (item: EstimateItemDetail) => void;
}

/** Иерархическая таблица сметы на TanStack Table */
export function EstimateTreeTable({
  chapters,
  editMode,
  search,
  readOnly,
  projectId,
  contractId,
  versionId,
  onEditItem,
}: Props) {
  // Строим дерево из глав верхнего уровня
  const topChapters = useMemo(
    () => chapters.filter((c) => c.parentId === null),
    [chapters]
  );

  const treeData = useMemo(() => buildTree(topChapters, 0, search), [topChapters, search]);

  // По умолчанию все разделы раскрыты (true = expand all)
  const [expanded, setExpanded] = useState<ExpandedState>(true);

  const getSubRows = useCallback((row: TreeRow) => row.subRows, []);

  const table = useReactTable({
    data: treeData,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getSubRows,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    autoResetExpanded: false,
  });

  if (treeData.length === 0 && !search) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground border rounded-md">
        Нет разделов. Добавьте раздел, чтобы начать заполнять смету.
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      {/* Шапка таблицы */}
      <div className="grid grid-cols-[50px_90px_1fr_60px_80px_60px_80px_90px_60px_100px_36px] text-xs text-muted-foreground font-medium border-b bg-muted/30 px-2 py-1.5 min-w-[900px]">
        <span>№ п.п</span>
        <span>Обосн.</span>
        <span>Наименование работ и затрат</span>
        <span>Ед.</span>
        <span className="text-right">Кол-во</span>
        <span className="text-right">Коэф.</span>
        <span className="text-right">Всего</span>
        <span className="text-right">Цена/ед.</span>
        <span className="text-right">Коэф.</span>
        <span className="text-right">Итого</span>
        <span />
      </div>

      {/* Строки */}
      {table.getRowModel().rows.map((row: Row<TreeRow>) => (
        <EstimateTreeRow
          key={row.id}
          row={row}
          editMode={editMode}
          readOnly={readOnly}
          search={search}
          projectId={projectId}
          contractId={contractId}
          versionId={versionId}
          onEditItem={onEditItem}
        />
      ))}

      {treeData.length > 0 && table.getRowModel().rows.length === 0 && search && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          Ничего не найдено по запросу «{search}»
        </div>
      )}
    </div>
  );
}
