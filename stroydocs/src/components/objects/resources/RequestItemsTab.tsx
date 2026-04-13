'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EditableCell } from '@/components/shared/EditableCell';
import { ItemStatusSelect } from './ItemStatusSelect';
import { Trash2, Plus, ArrowRightLeft } from 'lucide-react';
import type { RequestCardData, RequestItemData } from './useRequestCard';
import { useAddItem, useUpdateItem, useDeleteItem, useTransferItems } from './useRequestCard';

interface Props {
  objectId: string;
  request: RequestCardData;
}

// Вычисление итоговой суммы по позиции
function calcTotal(item: RequestItemData): string {
  if (item.quantity == null || item.unitPrice == null) return '—';
  return (item.quantity * item.unitPrice).toLocaleString('ru-RU', {
    maximumFractionDigits: 2,
  });
}

// Построитель обработчика сохранения поля позиции
function makeUpdater(
  updateItem: ReturnType<typeof useUpdateItem>,
  itemId: string,
  field: 'quantity' | 'unit' | 'unitPrice' | 'notes',
) {
  return async (val: string): Promise<void> => {
    if (field === 'quantity') {
      await updateItem.mutateAsync({ itemId, data: { quantity: val === '' ? 1 : parseFloat(val) } });
    } else if (field === 'unitPrice') {
      await updateItem.mutateAsync({ itemId, data: { unitPrice: val === '' ? null : parseFloat(val) } });
    } else if (field === 'unit') {
      await updateItem.mutateAsync({ itemId, data: { unit: val.trim() || null } });
    } else {
      await updateItem.mutateAsync({ itemId, data: { notes: val.trim() || null } });
    }
  };
}

export function RequestItemsTab({ objectId, request }: Props) {
  const addItem = useAddItem(objectId, request.id);
  const updateItem = useUpdateItem(objectId, request.id);
  const deleteItem = useDeleteItem(objectId, request.id);
  const transferItems = useTransferItems(objectId, request.id);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const items = request.items;

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(items.map((i) => i.id)) : new Set());
  }

  function handleTransfer() {
    if (selectedIds.size === 0) return;
    transferItems.mutate({ itemIds: Array.from(selectedIds) });
    setSelectedIds(new Set());
  }

  const allChecked = items.length > 0 && selectedIds.size === items.length;
  const someChecked = selectedIds.size > 0 && !allChecked;

  return (
    <div className="space-y-3 pt-2">
      {/* Панель действий над выделенными позициями */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            Выбрано: {selectedIds.size}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTransfer}
            disabled={transferItems.isPending}
            className="h-7 text-xs"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
            {transferItems.isPending ? 'Перенос...' : 'Перенести в новую заявку'}
          </Button>
        </div>
      )}

      {/* Таблица позиций */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 w-8">
                <Checkbox
                  checked={allChecked}
                  data-state={someChecked ? 'indeterminate' : undefined}
                  onCheckedChange={(v) => toggleAll(!!v)}
                  aria-label="Выбрать все"
                />
              </th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground w-8">#</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[160px]">
                Наименование
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[80px]">
                Ед.
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[80px]">
                Кол-во
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[90px]">
                Цена
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[90px]">
                Итого
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[140px]">
                Статус
              </th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  Позиций нет. Нажмите «Добавить позицию» чтобы начать.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`border-b last:border-b-0 hover:bg-muted/30 ${selectedIds.has(item.id) ? 'bg-blue-50/60' : ''}`}
                >
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                      aria-label={`Выбрать позицию ${idx + 1}`}
                    />
                  </td>
                  <td className="px-2 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                  <td className="px-3 py-2">
                    {item.nomenclature ? (
                      <span className="text-sm">{item.nomenclature.name}</span>
                    ) : (
                      <EditableCell
                        value={item.notes ?? ''}
                        onSave={makeUpdater(updateItem, item.id, 'notes')}
                        type="text"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={item.unit ?? ''}
                      onSave={makeUpdater(updateItem, item.id, 'unit')}
                      type="text"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <EditableCell
                      value={String(item.quantity)}
                      onSave={makeUpdater(updateItem, item.id, 'quantity')}
                      type="number"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <EditableCell
                      value={item.unitPrice != null ? String(item.unitPrice) : ''}
                      onSave={makeUpdater(updateItem, item.id, 'unitPrice')}
                      type="number"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {calcTotal(item)}
                  </td>
                  <td className="px-3 py-2">
                    <ItemStatusSelect
                      statusId={item.statusId}
                      onChange={(sid) => {
                        updateItem.mutateAsync({ itemId: item.id, data: { statusId: sid } });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteItem.mutate(item.id)}
                      disabled={deleteItem.isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Удалить позицию"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Итого по заявке */}
      {items.length > 0 && (
        <div className="text-right text-sm font-medium pr-2">
          Итого по заявке:{' '}
          {items
            .reduce((sum, item) => {
              if (item.quantity == null || item.unitPrice == null) return sum;
              return sum + item.quantity * item.unitPrice;
            }, 0)
            .toLocaleString('ru-RU', { maximumFractionDigits: 2 })}{' '}
          ₽
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => addItem.mutate({ quantity: 1 })}
        disabled={addItem.isPending}
      >
        <Plus className="h-4 w-4 mr-1" />
        {addItem.isPending ? 'Добавление...' : 'Добавить позицию'}
      </Button>
    </div>
  );
}
