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
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  number: z.string().min(1, 'Укажите номер'),
  title: z.string().min(1, 'Укажите наименование'),
  description: z.string().optional(),
  amount: z.string().refine((v) => !isNaN(Number(v)), 'Введите сумму'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { number: string; title: string; description?: string; amount: number }) => void;
  isPending?: boolean;
}

export function CreateChangeOrderDialog({ open, onOpenChange, onSubmit, isPending }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function handleFormSubmit(values: FormValues) {
    onSubmit({
      number: values.number,
      title: values.title,
      description: values.description || undefined,
      amount: Number(values.amount),
    });
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новое доп. соглашение</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number">Номер</Label>
              <Input id="number" placeholder="ДС-1" {...register('number')} />
              {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Сумма (руб.)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="-500000 или +1200000"
                {...register('amount')}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Наименование</Label>
            <Input id="title" placeholder="Дополнительные работы по устройству кровли" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              placeholder="Подробное описание изменений объёма работ..."
              rows={3}
              {...register('description')}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Положительная сумма — дополнительные работы, отрицательная — сокращение объёма
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
