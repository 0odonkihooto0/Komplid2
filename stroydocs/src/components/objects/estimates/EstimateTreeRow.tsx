'use client';

import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Row } from '@tanstack/react-table';
import type { TreeRow } from './EstimateTreeTable';
import { useEstimateTree, type EstimateItemDetail, type EstimateChapterDetail } from '@/hooks/useEstimateTree';

// ─── Форматирование ──────────────────────────────────────────────────────────

const fmtNum = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v);

const fmtRub = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);

// ─── Подсветка поиска ────────────────────────────────────────────────────────

function Highlight({ text, search }: { text: string; search: string }) {
  if (!search) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(search.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-inherit rounded-sm">{text.slice(idx, idx + search.length)}</mark>
      {text.slice(idx + search.length)}
    </>
  );
}

// ─── Компонент строки ────────────────────────────────────────────────────────

interface Props {
  row: Row<TreeRow>;
  editMode: boolean;
  readOnly: boolean;
  search: string;
  projectId: string;
  contractId: string;
  versionId: string;
  onEditItem: (item: EstimateItemDetail) => void;
}

/** Универсальная строка дерева сметы: раздел или позиция */
export function EstimateTreeRow({
  row,
  editMode,
  readOnly,
  search,
  projectId,
  contractId,
  versionId,
  onEditItem,
}: Props) {
  const original = row.original;

  if (original.rowType === 'chapter') {
    return <ChapterRow row={row} data={original.data} />;
  }

  return (
    <ItemRow
      row={row}
      data={original.data}
      editMode={editMode}
      readOnly={readOnly}
      search={search}
      projectId={projectId}
      contractId={contractId}
      versionId={versionId}
      onEditItem={onEditItem}
    />
  );
}

// ─── Строка раздела ──────────────────────────────────────────────────────────

function ChapterRow({ row, data }: { row: Row<TreeRow>; data: EstimateChapterDetail }) {
  const depth = row.original.depth;
  return (
    <div
      className="grid grid-cols-[50px_90px_1fr_60px_80px_60px_80px_90px_60px_100px_36px] items-center px-2 py-2 bg-muted/50 border-b font-semibold text-sm cursor-pointer hover:bg-muted/70 min-w-[900px]"
      style={{ paddingLeft: `${8 + depth * 20}px` }}
      onClick={() => row.toggleExpanded()}
    >
      <span className="text-muted-foreground text-xs">{data.code ?? ''}</span>
      <span />
      <span className="flex items-center gap-1.5">
        {row.getIsExpanded() ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        {data.name}
      </span>
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span className="text-right tabular-nums">{fmtRub(data.totalAmount)}</span>
      <span />
    </div>
  );
}

// ─── Строка позиции ──────────────────────────────────────────────────────────

function ItemRow({
  row,
  data,
  editMode,
  readOnly,
  search,
  projectId,
  contractId,
  versionId,
  onEditItem,
}: {
  row: Row<TreeRow>;
  data: EstimateItemDetail;
  editMode: boolean;
  readOnly: boolean;
  search: string;
  projectId: string;
  contractId: string;
  versionId: string;
  onEditItem: (item: EstimateItemDetail) => void;
}) {
  const [editingVolume, setEditingVolume] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateItem, deleteItem } = useEstimateTree({ projectId, contractId, versionId });

  const canEdit = editMode && !readOnly;
  const priceIdx = data.priceIndex ?? 1;
  const volumeTotal = (data.volume ?? 0) * priceIdx;

  // Начать inline-редактирование объёма
  const startVolumeEdit = () => {
    if (!canEdit) return;
    setEditingVolume(true);
    setEditValue(String(data.volume ?? ''));
    setTimeout(() => inputRef.current?.select(), 0);
  };

  // Сохранить изменение объёма
  const commitVolume = () => {
    setEditingVolume(false);
    const parsed = parseFloat(editValue);
    const value = isNaN(parsed) ? undefined : parsed;
    if (value !== data.volume) {
      updateItem.mutate({ itemId: data.id, volume: value });
    }
  };

  return (
    <div className="grid grid-cols-[50px_90px_1fr_60px_80px_60px_80px_90px_60px_100px_36px] items-center px-2 py-1.5 border-b last:border-0 hover:bg-muted/20 text-sm group min-w-[900px]">
      {/* № п.п */}
      <span className="text-xs text-muted-foreground tabular-nums">{data.sortOrder ?? ''}</span>

      {/* Обоснование */}
      <span className="text-xs text-muted-foreground truncate">{data.code ?? '—'}</span>

      {/* Наименование */}
      <span className="truncate pr-1">
        {data.isEdited && (
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5 shrink-0 align-middle" title="Позиция редактировалась" />
        )}
        <Highlight text={data.name} search={search} />
      </span>

      {/* Ед. изм. */}
      <span className="text-muted-foreground text-xs truncate">{data.unit ?? '—'}</span>

      {/* Кол-во на единицу — редактируемое в edit mode */}
      <div className="text-right">
        {editingVolume ? (
          <Input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitVolume}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitVolume();
              if (e.key === 'Escape') setEditingVolume(false);
            }}
            className="h-6 text-xs text-right px-1 w-full"
          />
        ) : (
          <button
            onClick={startVolumeEdit}
            className={`tabular-nums w-full text-right ${canEdit ? 'hover:underline hover:text-primary cursor-text' : 'cursor-default'}`}
          >
            {fmtNum(data.volume)}
          </button>
        )}
      </div>

      {/* Коэф. кол-ва */}
      <span className="tabular-nums text-right text-xs text-muted-foreground">{fmtNum(data.priceIndex)}</span>

      {/* Кол-во всего */}
      <span className="tabular-nums text-right">{fmtNum(volumeTotal)}</span>

      {/* Цена на единицу */}
      <span className="tabular-nums text-right">{fmtNum(data.unitPrice)}</span>

      {/* Коэф. стоимости */}
      <span className="tabular-nums text-right text-xs text-muted-foreground">
        {(data.overhead ?? 0) > 0 || (data.profit ?? 0) > 0
          ? `${fmtNum(data.overhead)} / ${fmtNum(data.profit)}`
          : '—'}
      </span>

      {/* Итого */}
      <span className="tabular-nums text-right font-medium">{fmtRub(data.totalPrice)}</span>

      {/* Меню действий */}
      {!readOnly ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditItem(data)}>Редактировать</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (confirm(`Удалить позицию «${data.name}»?`)) deleteItem.mutate(data.id);
              }}
            >
              Удалить позицию
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span />
      )}
    </div>
  );
}
