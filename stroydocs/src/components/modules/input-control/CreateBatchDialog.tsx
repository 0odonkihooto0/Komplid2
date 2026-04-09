'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBatchSchema, type CreateBatchInput } from '@/lib/validations/input-control';
import { useBatches } from './useBatches';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  materialId: string;
}

export function CreateBatchDialog({ open, onOpenChange, contractId, materialId }: Props) {
  const { createMutation } = useBatches(contractId, materialId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBatchInput>({
    resolver: zodResolver(createBatchSchema),
  });

  const onSubmit = (data: CreateBatchInput) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить партию</DialogTitle>
          <DialogDescription className="sr-only">Добавьте новую партию материала с указанием номера и количества</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Номер партии *</Label>
            <Input {...register('batchNumber')} placeholder="ПМ-001" />
            {errors.batchNumber && (
              <p className="text-sm text-destructive">{errors.batchNumber.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Количество *</Label>
              <Input
                type="number"
                step="0.01"
                {...register('quantity', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Дата поступления *</Label>
              <Input type="date" {...register('arrivalDate')} />
              {errors.arrivalDate && (
                <p className="text-sm text-destructive">{errors.arrivalDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Место хранения</Label>
            <Input {...register('storageLocation')} placeholder="Склад №1" />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
