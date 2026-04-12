'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EstimateItemDetail, EstimateCoefficientDetail } from '@/hooks/useEstimateTree';
import { useEstimateItemEdit, type ItemEditData } from './useEstimateItemEdit';

interface Props {
  open: boolean;
  item: EstimateItemDetail | null;
  coefficients: EstimateCoefficientDetail[];
  projectId: string;
  contractId: string;
  versionId: string;
  onClose: () => void;
}

/** Диалог редактирования позиции сметы с вкладками */
export function EstimateItemEditDialog({
  open,
  item,
  coefficients,
  projectId,
  contractId,
  versionId,
  onClose,
}: Props) {
  const { saveItem, getDefaults } = useEstimateItemEdit({ projectId, contractId, versionId });

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<ItemEditData>({
    defaultValues: item ? getDefaults(item) : {},
  });

  // Сбрасывать форму при смене позиции
  useEffect(() => {
    if (item) reset(getDefaults(item));
  }, [item, reset, getDefaults]);

  const onSubmit = async (data: ItemEditData) => {
    if (!item) return;
    await saveItem.mutateAsync({ itemId: item.id, data });
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактирование позиции</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Основное</TabsTrigger>
              <TabsTrigger value="prices">Цены</TabsTrigger>
              <TabsTrigger value="coefficients">Коэффициенты</TabsTrigger>
              <TabsTrigger value="rounding">Округления</TabsTrigger>
            </TabsList>

            {/* Вкладка: Основное */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <FormField label="Наименование" id="name">
                <Input id="name" {...register('name')} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Код (обоснование)" id="code">
                  <Input id="code" {...register('code')} />
                </FormField>
                <FormField label="Единица измерения" id="unit">
                  <Input id="unit" {...register('unit')} />
                </FormField>
              </div>
              <FormField label="Объём" id="volume">
                <Input id="volume" type="number" step="any" {...register('volume', { valueAsNumber: true })} />
              </FormField>
            </TabsContent>

            {/* Вкладка: Цены */}
            <TabsContent value="prices" className="space-y-4 mt-4">
              <FormField label="Цена за единицу" id="unitPrice">
                <Input id="unitPrice" type="number" step="any" {...register('unitPrice', { valueAsNumber: true })} />
              </FormField>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Трудозатраты (ФОТ)" id="laborCost">
                  <Input id="laborCost" type="number" step="any" {...register('laborCost', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Материалы" id="materialCost">
                  <Input id="materialCost" type="number" step="any" {...register('materialCost', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Машины" id="machineryCost">
                  <Input id="machineryCost" type="number" step="any" {...register('machineryCost', { valueAsNumber: true })} />
                </FormField>
              </div>
            </TabsContent>

            {/* Вкладка: Коэффициенты */}
            <TabsContent value="coefficients" className="mt-4">
              {coefficients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Коэффициенты для этой версии не заданы.
                </p>
              ) : (
                <div className="space-y-2">
                  {coefficients.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                        c.isEnabled ? '' : 'text-red-500 bg-red-50'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{c.name}</span>
                        {c.code && <span className="ml-2 text-muted-foreground">({c.code})</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="tabular-nums font-medium">{c.value}</span>
                        <span className={`text-xs ${c.isEnabled ? 'text-green-600' : 'text-red-500'}`}>
                          {c.isEnabled ? 'Включён' : 'Отключён'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Вкладка: Округления */}
            <TabsContent value="rounding" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Индекс пересчёта цен" id="priceIndex">
                  <Input id="priceIndex" type="number" step="any" {...register('priceIndex', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Накладные расходы (НР)" id="overhead">
                  <Input id="overhead" type="number" step="any" {...register('overhead', { valueAsNumber: true })} />
                </FormField>
              </div>
              <FormField label="Сметная прибыль (СП)" id="profit">
                <Input id="profit" type="number" step="any" {...register('profit', { valueAsNumber: true })} />
              </FormField>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={!isDirty || saveItem.isPending}>
              {saveItem.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Обёртка для label + input */
function FormField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
