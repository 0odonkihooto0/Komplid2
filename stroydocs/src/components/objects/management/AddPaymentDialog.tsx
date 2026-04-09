'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/useToast';
import { createContractPaymentSchema, type CreateContractPaymentInput } from '@/lib/validations/contract-payment';
import type { useContractPayments } from './useContractPayments';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addMutation: ReturnType<typeof useContractPayments>['addMutation'];
}

export function AddPaymentDialog({ open, onOpenChange, addMutation }: Props) {
  const { toast } = useToast();

  const form = useForm<CreateContractPaymentInput>({
    resolver: zodResolver(createContractPaymentSchema),
    defaultValues: { paymentType: 'PLAN', amount: 0, paymentDate: '' },
  });

  const paymentType = form.watch('paymentType');

  function onSubmit(data: CreateContractPaymentInput) {
    addMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: 'Платёж добавлен' });
        form.reset();
        onOpenChange(false);
      },
      onError: (err: Error) => {
        toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить платёж</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select
                value={paymentType}
                onValueChange={(val) => form.setValue('paymentType', val as 'PLAN' | 'FACT')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLAN">Плановый</SelectItem>
                  <SelectItem value="FACT">Фактический</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Сумма, ₽</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                {...form.register('amount', { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Дата</Label>
            <Input type="date" {...form.register('paymentDate')} />
            {form.formState.errors.paymentDate && (
              <p className="text-xs text-destructive">{form.formState.errors.paymentDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Источник финансирования</Label>
            <Input placeholder="Федеральный бюджет, региональный и т.д." {...form.register('budgetType')} />
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea rows={2} placeholder="Комментарий к платежу" {...form.register('description')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Сохранение...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
