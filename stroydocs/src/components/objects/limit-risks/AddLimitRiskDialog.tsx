'use client';

import { useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/format';
import { BUDGET_KEYS, BUDGET_LABELS, type LimitRisk, type CreateLimitRiskData } from './useLimitRisks';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

const schema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  federalBudget: z.coerce.number().min(0).default(0),
  regionalBudget: z.coerce.number().min(0).default(0),
  localBudget: z.coerce.number().min(0).default(0),
  ownFunds: z.coerce.number().min(0).default(0),
  extraBudget: z.coerce.number().min(0).default(0),
  riskReason: z.string().min(1, 'Укажите причину риска'),
  resolutionProposal: z.string().optional(),
  completionDate: z.string().optional(),
  contractId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Contract {
  id: string;
  number: string;
  name: string;
}

interface AddLimitRiskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  editRecord?: LimitRisk | null;
  onSubmit: (data: CreateLimitRiskData) => void;
  isPending: boolean;
}

export function AddLimitRiskDialog({
  open,
  onOpenChange,
  projectId,
  editRecord,
  onSubmit,
  isPending,
}: AddLimitRiskDialogProps) {
  const isEdit = editRecord !== null && editRecord !== undefined;

  // Загрузка договоров объекта для селекта
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['contracts-for-select', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/contracts`);
      const json = await res.json();
      if (!json.success) return [];
      return json.data.map((c: { id: string; number: string; name: string }) => ({
        id: c.id,
        number: c.number,
        name: c.name,
      }));
    },
    enabled: open,
  });

  const defaultValues: FormValues = {
    year: currentYear,
    federalBudget: 0,
    regionalBudget: 0,
    localBudget: 0,
    ownFunds: 0,
    extraBudget: 0,
    riskReason: '',
    resolutionProposal: '',
    completionDate: '',
    contractId: '',
  };

  const { register, handleSubmit, control, watch, reset, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues,
    });

  // При открытии для редактирования — заполняем форму данными записи
  useEffect(() => {
    if (open && isEdit && editRecord) {
      reset({
        year: editRecord.year,
        federalBudget: editRecord.federalBudget,
        regionalBudget: editRecord.regionalBudget,
        localBudget: editRecord.localBudget,
        ownFunds: editRecord.ownFunds,
        extraBudget: editRecord.extraBudget,
        riskReason: editRecord.riskReason,
        resolutionProposal: editRecord.resolutionProposal ?? '',
        completionDate: editRecord.completionDate
          ? editRecord.completionDate.slice(0, 10)
          : '',
        contractId: editRecord.contractId ?? '',
      });
    } else if (open && !isEdit) {
      reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit]);

  const values = watch();
  const total = useMemo(
    () =>
      (values.federalBudget ?? 0) +
      (values.regionalBudget ?? 0) +
      (values.localBudget ?? 0) +
      (values.ownFunds ?? 0) +
      (values.extraBudget ?? 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values.federalBudget, values.regionalBudget, values.localBudget, values.ownFunds, values.extraBudget]
  );

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset(defaultValues);
    onOpenChange(isOpen);
  }

  function handleFormSubmit(v: FormValues) {
    onSubmit({
      year: v.year,
      federalBudget: v.federalBudget ?? 0,
      regionalBudget: v.regionalBudget ?? 0,
      localBudget: v.localBudget ?? 0,
      ownFunds: v.ownFunds ?? 0,
      extraBudget: v.extraBudget ?? 0,
      riskReason: v.riskReason,
      resolutionProposal: v.resolutionProposal || undefined,
      completionDate: v.completionDate || null,
      contractId: v.contractId || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Редактировать риск' : 'Добавить риск неосвоения лимитов'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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

          {/* 5 полей бюджетов */}
          <div className="space-y-3">
            {BUDGET_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <Label>{BUDGET_LABELS[key]}, руб.</Label>
                <Input
                  {...register(key)}
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                />
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

          {/* Причина риска */}
          <div className="space-y-1">
            <Label>Причина риска <span className="text-destructive">*</span></Label>
            <Textarea
              {...register('riskReason')}
              placeholder="Опишите причину риска неосвоения лимитов"
              rows={3}
            />
            {errors.riskReason && (
              <p className="text-xs text-destructive">{errors.riskReason.message}</p>
            )}
          </div>

          {/* Предложения по исключению */}
          <div className="space-y-1">
            <Label>Предложения по исключению риска</Label>
            <Textarea
              {...register('resolutionProposal')}
              placeholder="Опишите меры по устранению риска"
              rows={3}
            />
          </div>

          {/* Контракт */}
          <div className="space-y-1">
            <Label>Контракт</Label>
            <Controller
              name="contractId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Не выбрано</SelectItem>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.number} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Возможная дата завершения освоения */}
          <div className="space-y-1">
            <Label>Возможная дата завершения освоения</Label>
            <Input {...register('completionDate')} type="date" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit ? 'Сохранение...' : 'Создание...'
                : isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
