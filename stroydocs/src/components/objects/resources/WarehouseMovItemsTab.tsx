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

// Форматирование денежного значения
function formatMoney(value: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

export function WarehouseMovItemsTab({ objectId, movement }: Props) {
  const addLine = useAddLine(objectId, movement.id);
  const deleteLine = useDeleteLine(objectId, movement.id);

  // Состояние формы добавления строки
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('1');

  const { options } = useNomenclature(objectId, search);
  const isDraft = movement.status === 'DRAFT';

  // Вычисление итоговой суммы по всем строкам
  const grandTotal = movement.lines.reduce((sum, line) => {
    if (line.totalPrice != null) return sum + line.totalPrice;
    if (line.quantity != null && line.unitPrice != null)
      return sum + line.quantity * line.unitPrice;
    return sum;
  }, 0);

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

  return (
    <div className="space-y-3 pt-2">
      {/* Таблица строк движения */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[180px]">
                Номенклатура
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[70px]">
                Кол-во
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[60px]">
                Ед.
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[90px]">
                Цена, ₽
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[90px]">
                Итого, ₽
              </th>
              {/* Колонка удаления — только для черновика */}
              {isDraft && <th className="px-3 py-2 w-8" />}
            </tr>
          </thead>
          <tbody>
            {movement.lines.length === 0 ? (
              <tr>
                <td
                  colSpan={isDraft ? 7 : 6}
                  className="px-3 py-8 text-center text-muted-foreground text-sm"
                >
                  Строк нет. {isDraft ? 'Добавьте номенклатуру ниже.' : ''}
                </td>
              </tr>
            ) : (
              movement.lines.map((line, idx) => (
                <tr key={line.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                  <td className="px-3 py-2">
                    {line.nomenclature ? (
                      <span>{line.nomenclature.name}</span>
                    ) : (
                      <span className="italic text-muted-foreground">Без номенклатуры</span>
                    )}
                    {line.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{line.notes}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{line.quantity}</td>
                  <td className="px-3 py-2">
                    {line.unit ?? line.nomenclature?.unit ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatMoney(line.unitPrice)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {line.totalPrice != null
                      ? formatMoney(line.totalPrice)
                      : line.unitPrice != null
                        ? formatMoney(line.quantity * line.unitPrice)
                        : '—'}
                  </td>
                  {isDraft && (
                    <td className="px-3 py-2">
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Итого */}
      {movement.lines.length > 0 && grandTotal > 0 && (
        <div className="text-right text-sm font-medium pr-2">
          Итого: {grandTotal.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
        </div>
      )}

      {/* Форма добавления строки — только для черновика */}
      {isDraft && (
        <div className="flex flex-wrap items-end gap-2 pt-1">
          {/* Поле поиска номенклатуры */}
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
              {/* Выпадающий список совпадений */}
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
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({opt.unit})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Количество */}
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
