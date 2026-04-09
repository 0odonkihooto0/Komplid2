'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createWorkRecordSchema, type CreateWorkRecordInput } from '@/lib/validations/work-record';
import { MEASUREMENT_UNIT_LABELS } from '@/utils/constants';
import { useWorkRecords } from './useWorkRecords';
import { useWorkItems } from '@/components/modules/work-items/useWorkItems';
import { useMaterials } from '@/components/modules/materials/useMaterials';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
}

export function CreateWorkRecordDialog({ open, onOpenChange, contractId }: Props) {
  const { createMutation } = useWorkRecords(contractId);
  const { workItems } = useWorkItems(contractId);
  const { materials } = useMaterials(contractId);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateWorkRecordInput>({
    resolver: zodResolver(createWorkRecordSchema),
    defaultValues: { writeoffs: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'writeoffs',
  });

  const onSubmit = (data: CreateWorkRecordInput) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать запись о работе</DialogTitle>
          <DialogDescription className="sr-only">Зафиксируйте выполнение работ с указанием места, даты и списания материалов</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Дата выполнения *</Label>
              <Input type="date" {...register('date')} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Место проведения *</Label>
              <Input {...register('location')} placeholder="Секция 1, этаж 3" />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Вид работ *</Label>
            <Select onValueChange={(v) => setValue('workItemId', v, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите вид работ" />
              </SelectTrigger>
              <SelectContent>
                {workItems.map((wi) => (
                  <SelectItem key={wi.id} value={wi.id}>
                    <span className="font-mono text-xs">{wi.projectCipher}</span> — {wi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.workItemId && (
              <p className="text-sm text-destructive">{errors.workItemId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Input {...register('description')} placeholder="Описание выполненных работ" />
          </div>

          <div className="space-y-2">
            <Label>Норматив (ГОСТ, СП, СНиП)</Label>
            <Input {...register('normative')} placeholder="СП 70.13330.2012" />
          </div>

          {/* Списание материалов */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Списание материалов</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ materialId: '', quantity: 0 })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Добавить
              </Button>
            </div>

            {fields.map((field, index) => {
              const selectedMaterial = materials.find(
                (m) => m.id === field.materialId
              );
              const remaining = selectedMaterial
                ? selectedMaterial.quantityReceived - selectedMaterial.quantityUsed
                : 0;

              return (
                <div key={field.id} className="flex items-end gap-2 rounded-md border p-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Материал</Label>
                    <Select
                      onValueChange={(v) =>
                        setValue(`writeoffs.${index}.materialId`, v, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите материал" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} (ост: {m.quantityReceived - m.quantityUsed}{' '}
                            {MEASUREMENT_UNIT_LABELS[m.unit]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">
                      Кол-во {remaining > 0 && `(до ${remaining})`}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`writeoffs.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
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
