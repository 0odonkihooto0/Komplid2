'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PIRClosureItemRow, FillItemsPayload } from './usePIRClosureDetail';

interface Props {
  items: PIRClosureItemRow[];
  isReadonly: boolean;
  onSave: (payload: FillItemsPayload) => void;
  isSaving: boolean;
}

interface EditRow {
  workName: string;
  unit: string;
  volume: string;
  amount: string;
}

function toEditRows(items: PIRClosureItemRow[]): EditRow[] {
  return items.map((item) => ({
    workName: item.workName,
    unit: item.unit ?? '',
    volume: item.volume != null ? String(item.volume) : '',
    amount: item.amount != null ? String(item.amount) : '',
  }));
}

export function PIRClosureItemsEditor({ items, isReadonly, onSave, isSaving }: Props) {
  const [rows, setRows] = useState<EditRow[]>(() => toEditRows(items));

  // Синхронизируем строки при обновлении данных с сервера
  useEffect(() => {
    setRows(toEditRows(items));
  }, [items]);

  const addRow = () =>
    setRows((prev) => [...prev, { workName: '', unit: '', volume: '', amount: '' }]);

  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const updateCell = (idx: number, field: keyof EditRow, value: string) =>
    setRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );

  const handleSave = () => {
    const payload: FillItemsPayload = {
      items: rows
        .filter((r) => r.workName.trim())
        .map((r) => ({
          workName: r.workName.trim(),
          unit: r.unit || undefined,
          volume: r.volume ? parseFloat(r.volume) : undefined,
          amount: r.amount ? parseFloat(r.amount) : undefined,
        })),
    };
    onSave(payload);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Наименование работы</th>
              <th className="w-24 px-3 py-2 text-left font-medium text-muted-foreground">Ед. изм.</th>
              <th className="w-28 px-3 py-2 text-left font-medium text-muted-foreground">Объём</th>
              <th className="w-32 px-3 py-2 text-left font-medium text-muted-foreground">Стоимость, ₽</th>
              {!isReadonly && <th className="w-10 px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Позиции не добавлены
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="px-2 py-1.5">
                  <Input
                    value={row.workName}
                    onChange={(e) => updateCell(idx, 'workName', e.target.value)}
                    disabled={isReadonly}
                    placeholder="Наименование работы"
                    className="h-8 border-0 bg-transparent px-1 shadow-none focus-visible:ring-1"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.unit}
                    onChange={(e) => updateCell(idx, 'unit', e.target.value)}
                    disabled={isReadonly}
                    placeholder="шт."
                    className="h-8 border-0 bg-transparent px-1 shadow-none focus-visible:ring-1"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.volume}
                    onChange={(e) => updateCell(idx, 'volume', e.target.value)}
                    disabled={isReadonly}
                    type="number"
                    placeholder="0"
                    className="h-8 border-0 bg-transparent px-1 shadow-none focus-visible:ring-1"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.amount}
                    onChange={(e) => updateCell(idx, 'amount', e.target.value)}
                    disabled={isReadonly}
                    type="number"
                    placeholder="0"
                    className="h-8 border-0 bg-transparent px-1 shadow-none focus-visible:ring-1"
                  />
                </td>
                {!isReadonly && (
                  <td className="px-2 py-1.5 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(idx)}
                      aria-label="Удалить строку"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isReadonly && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Добавить позицию
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || rows.filter((r) => r.workName.trim()).length === 0}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isSaving ? 'Сохранение…' : 'Сохранить позиции'}
          </Button>
        </div>
      )}
    </div>
  );
}
