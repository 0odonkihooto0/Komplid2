'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createMaterialSchema, type CreateMaterialInput } from '@/lib/validations/material';
import { MEASUREMENT_UNIT_LABELS } from '@/utils/constants';
import { useMaterials } from './useMaterials';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
}

export function CreateMaterialDialog({ open, onOpenChange, contractId }: Props) {
  const { createMutation } = useMaterials(contractId);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateMaterialInput>({
    resolver: zodResolver(createMaterialSchema),
    defaultValues: { unit: 'PIECE' },
  });

  const onSubmit = (data: CreateMaterialInput) => {
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
          <DialogTitle>Добавить материал</DialogTitle>
          <DialogDescription className="sr-only">Добавьте новый материал с указанием поставщика, количества и единицы измерения</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Наименование *</Label>
            <Input {...register('name')} placeholder="Бетон В25, арматура А500С..." />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Поставщик</Label>
            <Input {...register('supplier')} placeholder="ООО «Поставщик»" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Номер накладной</Label>
              <Input {...register('invoiceNumber')} placeholder="№123" />
            </div>
            <div className="space-y-2">
              <Label>Дата накладной</Label>
              <Input type="date" {...register('invoiceDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Количество *</Label>
              <Input
                type="number"
                step="0.01"
                {...register('quantityReceived', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.quantityReceived && (
                <p className="text-sm text-destructive">{errors.quantityReceived.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Единица измерения *</Label>
              <Select
                defaultValue="PIECE"
                onValueChange={(v) => setValue('unit', v as CreateMaterialInput['unit'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEASUREMENT_UNIT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
