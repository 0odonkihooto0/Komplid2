'use client';

import { useState, useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type EstimateItemDetail, useEstimateTree } from '@/hooks/useEstimateTree';

const fmt = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v);

const fmtRub = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);

// Подсветка совпадений при поиске
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

interface Props {
  item: EstimateItemDetail;
  index: number;
  projectId: string;
  contractId: string;
  versionId: string;
  readOnly: boolean;
  search: string;
}

/** Строка позиции сметы с инлайн-редактированием объёма и цены */
export function EstimateItemRow({ item, index, projectId, contractId, versionId, readOnly, search }: Props) {
  // Локальные оптимистичные значения для мгновенного отклика
  const [localVolume, setLocalVolume] = useState<number | null>(item.volume);
  const [localUnitPrice, setLocalUnitPrice] = useState<number | null>(item.unitPrice);
  const [editingField, setEditingField] = useState<'volume' | 'unitPrice' | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { updateItem, deleteItem } = useEstimateTree({ projectId, contractId, versionId });

  // Оптимистичный расчёт итога на клиенте
  const optimisticTotal =
    localVolume !== null && localUnitPrice !== null ? localVolume * localUnitPrice : item.totalPrice;

  // Начать редактирование поля
  const startEdit = (field: 'volume' | 'unitPrice') => {
    if (readOnly) return;
    setEditingField(field);
    setEditValue(String(field === 'volume' ? (localVolume ?? '') : (localUnitPrice ?? '')));
    setTimeout(() => inputRef.current?.select(), 0);
  };

  // Сохранить изменение и отправить на сервер
  const commitEdit = () => {
    if (!editingField) return;
    const parsed = parseFloat(editValue);
    const value = isNaN(parsed) ? null : parsed;

    if (editingField === 'volume') {
      setLocalVolume(value);
      if (value !== item.volume)
        updateItem.mutate({ itemId: item.id, volume: value ?? undefined });
    } else {
      setLocalUnitPrice(value);
      if (value !== item.unitPrice)
        updateItem.mutate({ itemId: item.id, unitPrice: value ?? undefined });
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingField(null);
  };

  return (
    <div className="grid grid-cols-[2rem_1fr_5rem_6rem_7rem_7rem_6rem_6rem_2rem] gap-1 px-3 py-1.5 items-center border-b last:border-0 hover:bg-muted/20 text-sm group">
      {/* № */}
      <span className="text-xs text-muted-foreground tabular-nums">{index}</span>

      {/* Наименование + индикатор правки */}
      <span className="truncate pr-1">
        {item.isEdited && (
          <span
            className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5 shrink-0 align-middle"
            title="Позиция редактировалась"
          />
        )}
        {item.code && <span className="text-muted-foreground mr-1">{item.code}</span>}
        <Highlight text={item.name} search={search} />
      </span>

      {/* Единица измерения */}
      <span className="text-muted-foreground text-xs truncate">{item.unit ?? '—'}</span>

      {/* Объём — редактируемый */}
      <div className="text-right">
        {editingField === 'volume' ? (
          <Input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="h-6 text-xs text-right px-1 w-full"
          />
        ) : (
          <button
            onClick={() => startEdit('volume')}
            className={`tabular-nums w-full text-right ${!readOnly ? 'hover:underline hover:text-primary cursor-text' : 'cursor-default'}`}
            title={!readOnly ? 'Нажмите для редактирования' : undefined}
          >
            {fmt(localVolume)}
          </button>
        )}
      </div>

      {/* Цена за единицу — редактируемый */}
      <div className="text-right">
        {editingField === 'unitPrice' ? (
          <Input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="h-6 text-xs text-right px-1 w-full"
          />
        ) : (
          <button
            onClick={() => startEdit('unitPrice')}
            className={`tabular-nums w-full text-right ${!readOnly ? 'hover:underline hover:text-primary cursor-text' : 'cursor-default'}`}
            title={!readOnly ? 'Нажмите для редактирования' : undefined}
          >
            {fmt(localUnitPrice)}
          </button>
        )}
      </div>

      {/* Итого (оптимистичный расчёт) */}
      <span className="tabular-nums text-right font-medium">{fmtRub(optimisticTotal)}</span>

      {/* Трудозатраты */}
      <span className="tabular-nums text-right text-muted-foreground">{fmtRub(item.laborCost)}</span>

      {/* Материалы */}
      <span className="tabular-nums text-right text-muted-foreground">{fmtRub(item.materialCost)}</span>

      {/* Меню действий */}
      {!readOnly ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (confirm(`Удалить позицию «${item.name}»?`)) deleteItem.mutate(item.id);
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
