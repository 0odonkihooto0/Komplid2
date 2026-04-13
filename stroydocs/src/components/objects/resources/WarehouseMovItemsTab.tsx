'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';
import type { MovementDetail } from './useWarehouseMovement';
import { useAddLine, useDeleteLine, useNomenclature } from './useWarehouseMovement';

interface Props {
  objectId: string;
  movement: MovementDetail;
}

function fmt(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

export function WarehouseMovItemsTab({ objectId, movement }: Props) {
  const addLine = useAddLine(objectId, movement.id);
  const deleteLine = useDeleteLine(objectId, movement.id);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('1');

  const { options } = useNomenclature(objectId, search);
  const isDraft = movement.status === 'DRAFT';

  // Итоги по таблице
  const totalSumNoVat = movement.lines.reduce((s, l) => s + (l.totalPrice ?? 0), 0);
  const totalVatAmount = movement.lines.reduce((s, l) => s + (l.vatAmount ?? 0), 0);
  const totalWithVat = movement.lines.reduce((s, l) => s + (l.totalWithVat ?? 0), 0);

  function handleAdd() {
    if (!selectedId || !quantity) return;
    addLine.mutate(
      { nomenclatureId: selectedId, quantity: parseFloat(quantity) },
      {
        onSuccess: () => {
          setSearch('');
          setSelectedId('');
          setQuantity('1');
        },
      }
    );
  }

  const colCount = isDraft ? 14 : 13;

  return (
    <div className="space-y-3 pt-2">
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '900px' }}>
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-2 text-left font-medium text-muted-foreground w-7">#</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[160px]">Номенклатура</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground min-w-[60px]">Кол-во</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[50px]">Ед.</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground min-w-[80px]">Цена, ₽</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground min-w-[60px]">Скидка %</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground min-w-[90px]">Сумма без НДС</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground min-w-[70px]">Ставка НДС</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground min-w-[80px]">Сумма НДС</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground min-w-[90px]">Сумма с НДС</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[80px]">Основание</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[80px]">Комментарий</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[70px]">ГТД</th>
              {isDraft && <th className="px-2 py-2 w-8" />}
            </tr>
          </thead>
          <tbody>
            {movement.lines.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-3 py-8 text-center text-muted-foreground text-sm"
                >
                  Строк нет. {isDraft ? 'Добавьте номенклатуру ниже.' : ''}
                </td>
              </tr>
            ) : (
              movement.lines.map((line, idx) => {
                const effectiveVatRate = line.lineVatRate ?? movement.vatRate;
                return (
                  <tr key={line.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-2 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                    <td className="px-2 py-2">
                      {line.nomenclature ? (
                        <div>
                          <span>{line.nomenclature.name}</span>
                          {line.country && <p className="text-xs text-muted-foreground">Страна: {line.country}</p>}
                          {line.recipientAddress && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{line.recipientAddress}</p>}
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground">Без номенклатуры</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">{line.quantity}</td>
                    <td className="px-2 py-2">{line.unit ?? line.nomenclature?.unit ?? '—'}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground">{fmt(line.unitPrice)}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground">
                      {line.discount != null ? `${line.discount}%` : '—'}
                    </td>
                    <td className="px-2 py-2 text-right">{fmt(line.totalPrice)}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground">
                      {effectiveVatRate != null ? `${effectiveVatRate}%` : '—'}
                    </td>
                    <td className="px-2 py-2 text-right text-muted-foreground">{fmt(line.vatAmount)}</td>
                    <td className="px-2 py-2 text-right font-medium">{fmt(line.totalWithVat)}</td>
                    <td className="px-2 py-2 text-muted-foreground text-xs">{line.basis ?? '—'}</td>
                    <td className="px-2 py-2 text-muted-foreground text-xs">{line.comment ?? '—'}</td>
                    <td className="px-2 py-2 text-muted-foreground text-xs">{line.gtd ?? '—'}</td>
                    {isDraft && (
                      <td className="px-2 py-2">
                        <button
                          onClick={() => deleteLine.mutate(line.id)}
                          disabled={deleteLine.isPending}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Удалить строку"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Итоговая строка */}
          {movement.lines.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/30 font-medium">
                <td colSpan={6} className="px-2 py-2 text-right text-xs text-muted-foreground">
                  Итого:
                </td>
                <td className="px-2 py-2 text-right">{fmt(totalSumNoVat)}</td>
                <td />
                <td className="px-2 py-2 text-right text-muted-foreground">{fmt(totalVatAmount)}</td>
                <td className="px-2 py-2 text-right">{fmt(totalWithVat)}</td>
                <td colSpan={isDraft ? 4 : 3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Форма добавления строки — только для черновика */}
      {isDraft && (
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <label className="text-xs text-muted-foreground">Номенклатура</label>
            <div className="relative">
              <Input
                placeholder="Начните ввод (от 2 символов)..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedId('');
                }}
                className="text-sm"
              />
              {options.length > 0 && !selectedId && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        setSelectedId(opt.id);
                        setSearch(opt.name);
                      }}
                    >
                      {opt.name}
                      {opt.unit && (
                        <span className="ml-1 text-xs text-muted-foreground">({opt.unit})</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 w-24">
            <label className="text-xs text-muted-foreground">Количество</label>
            <Input
              type="number"
              min="0.001"
              step="any"
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="text-sm"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={!selectedId || !quantity || addLine.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            {addLine.isPending ? 'Добавление...' : 'Добавить'}
          </Button>
        </div>
      )}
    </div>
  );
}
