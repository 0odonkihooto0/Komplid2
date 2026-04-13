'use client';

import { Button } from '@/components/ui/button';
import { EditableCell } from '@/components/shared/EditableCell';
import { Trash2, Plus } from 'lucide-react';
import type { SupplierOrderCardData, SupplierOrderItemData, UpdateItemData } from './useSupplierOrderCard';
import { useAddOrderItem, useUpdateOrderItem, useDeleteOrderItem } from './useSupplierOrderCard';

interface Props {
  objectId: string;
  order: SupplierOrderCardData;
}

// Форматирование числа для отображения
function fmt(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

// Вычисление суммы без НДС: qty × price × (1 - discount/100)
function calcAmountExclVat(item: SupplierOrderItemData): number | null {
  if (item.quantity == null || item.unitPrice == null) return null;
  const disc = item.discount ?? 0;
  return item.quantity * item.unitPrice * (1 - disc / 100);
}

// Вычисление суммы НДС
function calcVatAmount(item: SupplierOrderItemData): number | null {
  if (item.vatAmount != null) return item.vatAmount;
  const base = calcAmountExclVat(item);
  if (base == null || item.vatRate == null) return null;
  return base * (item.vatRate / 100);
}

// Вычисление суммы с НДС
function calcAmountInclVat(item: SupplierOrderItemData): number | null {
  const base = calcAmountExclVat(item);
  const vat = calcVatAmount(item);
  if (base == null) return null;
  return base + (vat ?? 0);
}

export function SupplierOrderItemsTab({ objectId, order }: Props) {
  const addItem = useAddOrderItem(objectId, order.id);
  const updateItem = useUpdateOrderItem(objectId, order.id);
  const deleteItem = useDeleteOrderItem(objectId, order.id);

  const items = order.items;

  function makeUpdater(itemId: string, field: keyof UpdateItemData) {
    return async (val: string): Promise<void> => {
      const numericFields: (keyof UpdateItemData)[] = [
        'quantity', 'unitPrice', 'discount', 'vatRate', 'vatAmount', 'weight', 'volume',
      ];
      if (numericFields.includes(field)) {
        await updateItem.mutateAsync({
          itemId,
          data: { [field]: val === '' ? null : parseFloat(val) } as UpdateItemData,
        });
      } else {
        // unit, basis — строковые поля
        await updateItem.mutateAsync({
          itemId,
          data: { [field]: val.trim() || null } as UpdateItemData,
        });
      }
    };
  }

  // Итоговые суммы
  const totals = items.reduce(
    (acc, item) => {
      acc.qty += item.quantity;
      const exclVat = calcAmountExclVat(item);
      const vatAmt = calcVatAmount(item);
      const inclVat = calcAmountInclVat(item);
      if (exclVat != null) acc.exclVat += exclVat;
      if (vatAmt != null) acc.vatAmount += vatAmt;
      if (inclVat != null) acc.inclVat += inclVat;
      return acc;
    },
    { qty: 0, exclVat: 0, vatAmount: 0, inclVat: 0 }
  );

  return (
    <div className="space-y-3 pt-2">
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-2 text-left font-medium text-muted-foreground w-8">#</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[140px]">Наименование</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground w-14">Ед.</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Кол-во</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground w-24">Цена, ₽</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Скидка, %</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground w-28">Сумма без НДС</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">НДС, %</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground w-28">Сумма НДС</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground w-28">Сумма с НДС</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Вес, кг</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Объём, м³</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[100px]">Основание</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  Позиций нет. Нажмите «Добавить позицию» чтобы начать.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-2 py-1.5 text-muted-foreground text-xs">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    {item.nomenclature ? (
                      <span className="text-sm">{item.nomenclature.name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Без номенклатуры</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <EditableCell value={item.unit ?? ''} onSave={makeUpdater(item.id, 'unit')} type="text" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <EditableCell value={String(item.quantity)} onSave={makeUpdater(item.id, 'quantity')} type="number" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <EditableCell value={item.unitPrice != null ? String(item.unitPrice) : ''} onSave={makeUpdater(item.id, 'unitPrice')} type="number" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <EditableCell value={item.discount != null ? String(item.discount) : ''} onSave={makeUpdater(item.id, 'discount')} type="number" />
                  </td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">
                    {fmt(calcAmountExclVat(item))}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <EditableCell value={item.vatRate != null ? String(item.vatRate) : ''} onSave={makeUpdater(item.id, 'vatRate')} type="number" />
                  </td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">
                    {fmt(calcVatAmount(item))}
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium">
                    {fmt(calcAmountInclVat(item))}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <EditableCell value={item.weight != null ? String(item.weight) : ''} onSave={makeUpdater(item.id, 'weight')} type="number" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <EditableCell value={item.volume != null ? String(item.volume) : ''} onSave={makeUpdater(item.id, 'volume')} type="number" />
                  </td>
                  <td className="px-2 py-1.5">
                    <EditableCell value={item.basis ?? ''} onSave={makeUpdater(item.id, 'basis')} type="text" />
                  </td>
                  <td className="px-2 py-1.5">
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
          {/* Итоговая строка */}
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/30 font-medium">
                <td colSpan={3} className="px-2 py-2 text-xs text-muted-foreground">Итого</td>
                <td className="px-2 py-2 text-right text-xs">
                  {totals.qty.toLocaleString('ru-RU', { maximumFractionDigits: 3 })}
                </td>
                <td colSpan={2} />
                <td className="px-2 py-2 text-right text-xs">
                  {totals.exclVat.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                </td>
                <td />
                <td className="px-2 py-2 text-right text-xs">
                  {totals.vatAmount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-2 text-right">
                  {totals.inclVat.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => addItem.mutate({})}
        disabled={addItem.isPending}
      >
        <Plus className="h-4 w-4 mr-1" />
        {addItem.isPending ? 'Добавление...' : 'Добавить позицию'}
      </Button>
    </div>
  );
}
