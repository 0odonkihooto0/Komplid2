'use client';

import { useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/format';
import {
  RECORD_TYPE_LABELS,
  BUDGET_KEYS,
  BUDGET_LABELS,
  type FundingRecord,
  type UpdateFundingRecordData,
} from './useFundingRecords';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

const schema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  recordType: z.enum(['ALLOCATED', 'DELIVERED']),
  federalBudget: z.coerce.number().min(0).default(0),
  regionalBudget: z.coerce.number().min(0).default(0),
  localBudget: z.coerce.number().min(0).default(0),
  ownFunds: z.coerce.number().min(0).default(0),
  extraBudget: z.coerce.number().min(0).default(0),
});

type FormValues = z.infer<typeof schema>;

interface EditFundingDialogProps {
  record: FundingRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, data: UpdateFundingRecordData) => void;
  isPending: boolean;
}

export function EditFundingDialog({
  record,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: EditFundingDialogProps) {
  const { register, handleSubmit, control, watch, reset, formState: { errors } } =
    useForm({ resolver: zodResolver(schema) });

  // Заполняем форму при открытии с данными записи
  useEffect(() => {
    if (record) {
      reset({
        year: record.year,
        recordType: record.recordType,
        federalBudget: record.federalBudget,
        regionalBudget: record.regionalBudget,
        localBudget: record.localBudget,
        ownFunds: record.ownFunds,
        extraBudget: record.extraBudget,
      });
    }
  }, [record, reset]);

  const values = watch();
  const total = useMemo(
    () =>
      (Number(values.federalBudget) || 0) +
      (Number(values.regionalBudget) || 0) +
      (Number(values.localBudget) || 0) +
      (Number(values.ownFunds) || 0) +
      (Number(values.extraBudget) || 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values.federalBudget, values.regionalBudget, values.localBudget, values.ownFunds, values.extraBudget]
  );

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  function handleFormSubmit(values: z.infer<typeof schema>) {
    if (!record) return;
    onSubmit(record.id, values as UpdateFundingRecordData);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактировать запись финансирования</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Год */}
            <div className="space-y-1">
              <Label>Год</Label>
              <Controller
                name="year"
                control={control}
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Тип */}
            <div className="space-y-1">
              <Label>Тип</Label>
              <Controller
                name="recordType"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-4 pt-2"
                  >
                    {(Object.keys(RECORD_TYPE_LABELS) as Array<'ALLOCATED' | 'DELIVERED'>).map((key) => (
                      <div key={key} className="flex items-center gap-2">
                        <RadioGroupItem value={key} id={`edit-rt-${key}`} />
                        <Label htmlFor={`edit-rt-${key}`} className="font-normal cursor-pointer">
                          {RECORD_TYPE_LABELS[key]}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>
          </div>

          {/* 5 числовых полей бюджетов */}
          <div className="space-y-3">
            {BUDGET_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <Label>{BUDGET_LABELS[key]}, руб.</Label>
                <Input {...register(key)} type="number" min={0} step={0.01} placeholder="0" />
                {errors[key] && (
                  <p className="text-xs text-destructive">{errors[key]?.message}</p>
                )}
              </div>
            ))}
          </div>

          {/* Итого */}
          <div className="rounded-lg bg-muted px-4 py-2 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Итого</span>
            <span className="font-semibold">{formatCurrency(total)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
