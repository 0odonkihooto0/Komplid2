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
import { useAdvances } from './useAdvances';

const schema = z.object({
  number: z.string().max(50).optional(),
  date: z.string().min(1, 'Дата обязательна'),
  amount: z.number({ error: 'Введите сумму' }).positive('Сумма должна быть положительной'),
  budgetType: z.string().optional(),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const BUDGET_TYPES = [
  { value: 'Федеральный', label: 'Федеральный' },
  { value: 'Региональный', label: 'Региональный' },
  { value: 'Местный', label: 'Местный' },
  { value: 'Собственные', label: 'Собственные' },
  { value: 'Внебюджетные', label: 'Внебюджетные' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
}

export function AddAdvanceDialog({ open, onOpenChange, projectId, contractId }: Props) {
  const { createMutation } = useAdvances(projectId, contractId);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    await createMutation.mutateAsync({
      number: values.number || null,
      date: values.date,
      amount: values.amount,
      budgetType: values.budgetType || null,
      description: values.description || null,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить аванс</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="number">Номер</Label>
              <Input id="number" placeholder="А-1" {...register('number')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date">Дата *</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
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
                  <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Описание</Label>
            <Input id="description" placeholder="Описание аванса" {...register('description')} />
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
