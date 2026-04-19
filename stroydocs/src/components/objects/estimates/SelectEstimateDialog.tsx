'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import type { EstimateVersionSummary } from '@/hooks/useEstimateContract';

// ─── Типы ────────────────────────────────────────────────────────────────────

interface VersionItem {
  id: string;
  sortOrder: number | null;
  name: string;
  unit: string | null;
  volume: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
}

const fmtNum = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v);

const fmtRub = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: EstimateVersionSummary[];
  objectId: string;
  contractId: string | null;
}

/** Диалог «Выбрать расчет» — привязка локальных смет к позиции сметы контракта */
export function SelectEstimateDialog({ open, onOpenChange, versions, objectId, contractId }: Props) {
  const { toast } = useToast();

  // Выбранная версия (одна за раз для просмотра позиций)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  // Выбранные позиции (чекбоксы)
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  // Radio: какая позиция задаёт объём
  const [volumeSourceId, setVolumeSourceId] = useState<string | null>(null);
  // Radio: какая позиция задаёт единицу измерения
  const [unitSourceId, setUnitSourceId] = useState<string | null>(null);

  // Загрузка позиций выбранной версии
  const { data: items = [], isLoading: itemsLoading } = useQuery<VersionItem[]>({
    queryKey: ['select-estimate-items', objectId, contractId, selectedVersionId],
    queryFn: async () => {
      if (!contractId || !selectedVersionId) return [];
      const res = await fetch(
        `/api/projects/${objectId}/contracts/${contractId}/estimate-versions/${selectedVersionId}`
      );
      const json = await res.json() as {
        success: boolean;
        data: { chapters: Array<{ items: VersionItem[] }> };
      };
      if (!json.success) return [];
      // Плоский список позиций из всех глав
      return json.data.chapters.flatMap((ch) => ch.items ?? []);
    },
    enabled: !!contractId && !!selectedVersionId && open,
    staleTime: 30_000,
  });

  // Авторасчёт цены за единицу
  const calculatedUnitPrice = useMemo(() => {
    if (checkedItemIds.size === 0 || !volumeSourceId) return null;
    const totalSum = items
      .filter((item) => checkedItemIds.has(item.id))
      .reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
    const volumeItem = items.find((item) => item.id === volumeSourceId);
    const volume = volumeItem?.volume ?? 0;
    if (volume === 0) return null;
    return totalSum / volume;
  }, [items, checkedItemIds, volumeSourceId]);

  const toggleItem = (itemId: string) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleApply = () => {
    toast({ title: 'Расчёт привязан', description: `Выбрано позиций: ${checkedItemIds.size}` });
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setSelectedVersionId(null);
    setCheckedItemIds(new Set());
    setVolumeSourceId(null);
    setUnitSourceId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Выберите смету для позиции</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Список версий с чекбоксами */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Локальные сметы</p>
            <div className="rounded-md border max-h-40 overflow-y-auto">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 border-b last:border-0 ${selectedVersionId === v.id ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedVersionId(v.id)}
                >
                  <span className="text-sm font-medium flex-1">{v.name}</span>
                  <span className="text-xs text-muted-foreground">{v.totalAmount !== null ? fmtRub(v.totalAmount) : '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Позиции выбранной версии */}
          {selectedVersionId && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Позиции сметы</p>
              {itemsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Нет позиций</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-8 px-2 py-1.5" />
                        <th className="px-2 py-1.5 text-left">Наименование</th>
                        <th className="px-2 py-1.5 text-left w-14">Ед.</th>
                        <th className="px-2 py-1.5 text-right w-20">Объём</th>
                        <th className="px-2 py-1.5 text-right w-24">Стоимость</th>
                        <th className="px-2 py-1.5 text-center w-24">Для объёма</th>
                        <th className="px-2 py-1.5 text-center w-24">Для ед. изм.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-2 py-1.5 text-center">
                            <Checkbox
                              checked={checkedItemIds.has(item.id)}
                              onCheckedChange={() => toggleItem(item.id)}
                            />
                          </td>
                          <td className="px-2 py-1.5 truncate max-w-[200px]">{item.name}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{item.unit ?? '—'}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(item.volume)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{fmtRub(item.totalPrice)}</td>
                          <td className="px-2 py-1.5 text-center">
                            <RadioGroup value={volumeSourceId ?? ''} onValueChange={setVolumeSourceId} className="flex justify-center">
                              <RadioGroupItem value={item.id} />
                            </RadioGroup>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <RadioGroup value={unitSourceId ?? ''} onValueChange={setUnitSourceId} className="flex justify-center">
                              <RadioGroupItem value={item.id} />
                            </RadioGroup>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Автоматический расчёт цены */}
              {calculatedUnitPrice !== null && (
                <p className="text-sm text-muted-foreground">
                  Расчётная цена за единицу без НДС: <span className="font-semibold text-foreground">{fmtRub(calculatedUnitPrice)}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { handleReset(); onOpenChange(false); }}>
            Отмена
          </Button>
          <Button onClick={handleApply} disabled={checkedItemIds.size === 0}>
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
