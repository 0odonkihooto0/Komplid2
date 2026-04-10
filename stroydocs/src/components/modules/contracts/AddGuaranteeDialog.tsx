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
import { useGuarantees } from './useGuarantees';

const schema = z.object({
  amount: z.number({ invalid_type_error: 'Введите сумму' }).positive('Сумма должна быть положительной'),
  percentage: z.number().min(0).max(100).optional(),
  retentionDate: z.string().optional(),
  releaseDate: z.string().optional(),
  status: z.string().default('RETAINED'),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { value: 'RETAINED', label: 'Удержано' },
  { value: 'RELEASED', label: 'Возвращено' },
  { value: 'PARTIAL', label: 'Частично возвращено' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
}

export function AddGuaranteeDialog({ open, onOpenChange, projectId, contractId }: Props) {
  const { createMutation } = useGuarantees(projectId, contractId);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'RETAINED' },
  });

  const onSubmit = async (values: FormValues) => {
    await createMutation.mutateAsync({
      amount: values.amount,
      percentage: values.percentage,
      retentionDate: values.retentionDate || undefined,
      releaseDate: values.releaseDate || undefined,
      status: values.status,
      description: values.description || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить гарантийное удержание</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="amount">Сумма (руб.) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="500000"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="percentage">% от контракта</Label>
              <Input
                id="percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="5"
                {...register('percentage', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="retentionDate">Дата удержания</Label>
              <Input id="retentionDate" type="date" {...register('retentionDate')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="releaseDate">Дата возврата</Label>
              <Input id="releaseDate" type="date" {...register('releaseDate')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Статус</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Описание</Label>
            <Input id="description" placeholder="Описание удержания" {...register('description')} />
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
