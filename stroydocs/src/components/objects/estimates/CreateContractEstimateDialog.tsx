'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Loader2 } from 'lucide-react';
import type { CreateContractInput } from '@/hooks/useEstimateContract';

const schema = z.object({
  name: z.string().min(1, 'Введите наименование').max(200),
  period: z.string().max(50).optional(),
  chapter: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateContractInput) => Promise<void>;
  isSubmitting: boolean;
}

/** Диалог создания сметы контракта */
export function CreateContractEstimateDialog({ open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onFormSubmit = async (data: FormValues) => {
    await onSubmit({
      name: data.name,
      period: data.period || undefined,
      chapter: data.chapter || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать смету контракта</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="contract-name">Наименование *</Label>
            <Input
              id="contract-name"
              placeholder="Например: Смета контракта №1"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="contract-period">Период</Label>
            <Input
              id="contract-period"
              placeholder="Например: 2024 Q1"
              {...register('period')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contract-chapter">Глава</Label>
            <Input
              id="contract-chapter"
              placeholder="Номер или наименование главы"
              {...register('chapter')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
