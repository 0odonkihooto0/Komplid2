'use client';

import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FUNDING_TYPE_LABELS, type CreateFundingData, type FundingType } from './useFunding';

const schema = z.object({
  type: z.enum(['BUDGET', 'EXTRA_BUDGET', 'CREDIT', 'OWN_FUNDS']),
  name: z.string().min(1, 'Укажите название источника'),
  amount: z.coerce.number().positive('Сумма должна быть больше нуля'),
  period: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddFundingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateFundingData) => void;
  isPending: boolean;
}

export function AddFundingDialog({ open, onOpenChange, onSubmit, isPending }: AddFundingDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  function handleFormSubmit(values: FormValues) {
    onSubmit(values as CreateFundingData);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить источник финансирования</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Тип */}
          <div className="space-y-1">
            <Label>Тип финансирования</Label>
            <Select onValueChange={(v) => setValue('type', v as FundingType)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FUNDING_TYPE_LABELS) as FundingType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {FUNDING_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          {/* Название */}
          <div className="space-y-1">
            <Label>Источник / наименование</Label>
            <Input {...register('name')} placeholder="Например: Федеральный бюджет 2024" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Сумма */}
          <div className="space-y-1">
            <Label>Сумма, руб.</Label>
            <Input {...register('amount')} type="number" min={0} step={0.01} placeholder="0" />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Период */}
          <div className="space-y-1">
            <Label>
              Период <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Input {...register('period')} placeholder="Например: 2024" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Добавление...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
