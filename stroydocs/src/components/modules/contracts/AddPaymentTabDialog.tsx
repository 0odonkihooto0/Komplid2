'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { usePaymentsTab } from './usePaymentsTab';

const BUDGET_TYPES = [
  'Федеральный',
  'Региональный',
  'Местный',
  'Собственные',
  'Внебюджетные',
] as const;

const LIMIT_YEARS = Array.from({ length: 16 }, (_, i) => 2020 + i);

const schema = z.object({
  paymentType: z.enum(['PLAN', 'FACT']),
  paymentDate: z.string().min(1, 'Дата обязательна'),
  amount: z.number({ error: 'Введите сумму' }).positive('Сумма должна быть положительной'),
  limitYear: z.number().int().optional(),
  budgetType: z.string().optional(),
  limitAmount: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
}

export function AddPaymentTabDialog({ open, onOpenChange, projectId, contractId }: Props) {
  const { createMutation } = usePaymentsTab(projectId, contractId);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { paymentType: 'FACT' },
  });

  const onSubmit = async (values: FormValues) => {
    await createMutation.mutateAsync({
      paymentType: values.paymentType,
      paymentDate: values.paymentDate,
      amount: values.amount,
      limitYear: values.limitYear,
      budgetType: values.budgetType || undefined,
      limitAmount: values.limitAmount,
      description: values.description || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить платёж</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Тип платежа *</Label>
            <Select
              value={watch('paymentType')}
              onValueChange={(v) => setValue('paymentType', v as 'PLAN' | 'FACT')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLAN">Плановый</SelectItem>
                <SelectItem value="FACT">Фактический</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="paymentDate">Дата *</Label>
              <Input id="paymentDate" type="date" {...register('paymentDate')} />
              {errors.paymentDate && (
                <p className="text-xs text-destructive">{errors.paymentDate.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount">Сумма (руб.) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="1000000"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Лимит (год)</Label>
              <Select
                value={watch('limitYear')?.toString() ?? ''}
                onValueChange={(v) => setValue('limitYear', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Год лимита" />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="limitAmount">Лимит (сумма)</Label>
              <Input
                id="limitAmount"
                type="number"
                step="0.01"
                placeholder="5000000"
                {...register('limitAmount', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Тип бюджета</Label>
            <Select
              value={watch('budgetType') ?? ''}
              onValueChange={(v) => setValue('budgetType', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип бюджета" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_TYPES.map((bt) => (
                  <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Описание</Label>
            <Input id="description" placeholder="Описание платежа" {...register('description')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Добавление...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
