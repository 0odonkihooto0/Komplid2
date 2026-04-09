'use client';

import { Button } from '@/components/ui/button';
import { EditableCell } from '@/components/shared/EditableCell';
import { Trash2, Plus } from 'lucide-react';
import type { RequestCardData, RequestItemData } from './useRequestCard';
import { useAddItem, useUpdateItem, useDeleteItem } from './useRequestCard';

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

export function RequestItemsTab({ objectId, request }: Props) {
  const addItem = useAddItem(objectId, request.id);
  const updateItem = useUpdateItem(objectId, request.id);
  const deleteItem = useDeleteItem(objectId, request.id);

  const items = request.items;

  function handleAddItem() {
    addItem.mutate({ quantity: 1 });
  }

  // Явные ветки для каждого поля — гарантированная типовая безопасность без cast
  function makeUpdater(itemId: string, field: 'quantity' | 'unit' | 'unitPrice' | 'notes' | 'status') {
    return async (val: string): Promise<void> => {
      if (field === 'quantity') {
        await updateItem.mutateAsync({ itemId, data: { quantity: val === '' ? 1 : parseFloat(val) } });
      } else if (field === 'unitPrice') {
        await updateItem.mutateAsync({ itemId, data: { unitPrice: val === '' ? null : parseFloat(val) } });
      } else if (field === 'unit') {
        await updateItem.mutateAsync({ itemId, data: { unit: val.trim() || null } });
      } else if (field === 'notes') {
        await updateItem.mutateAsync({ itemId, data: { notes: val.trim() || null } });
      } else {
        await updateItem.mutateAsync({ itemId, data: { status: val.trim() || null } });
      }
    };
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Таблица позиций */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
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
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[100px]">
                Статус
              </th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  Позиций нет. Нажмите «Добавить позицию» чтобы начать.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                  <td className="px-3 py-2">
                    {/* Наименование: из номенклатуры (если есть) или заметки */}
                    {item.nomenclature ? (
                      <span className="text-sm">{item.nomenclature.name}</span>
                    ) : (
                      <EditableCell
                        value={item.notes ?? ''}
                        onSave={makeUpdater(item.id, 'notes')}
                        type="text"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={item.unit ?? ''}
                      onSave={makeUpdater(item.id, 'unit')}
                      type="text"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <EditableCell
                      value={String(item.quantity)}
                      onSave={makeUpdater(item.id, 'quantity')}
                      type="number"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <EditableCell
                      value={item.unitPrice != null ? String(item.unitPrice) : ''}
                      onSave={makeUpdater(item.id, 'unitPrice')}
                      type="number"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {calcTotal(item)}
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={item.status ?? ''}
                      onSave={makeUpdater(item.id, 'status')}
                      type="text"
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
        onClick={handleAddItem}
        disabled={addItem.isPending}
      >
        <Plus className="h-4 w-4 mr-1" />
        {addItem.isPending ? 'Добавление...' : 'Добавить позицию'}
      </Button>
    </div>
  );
}
