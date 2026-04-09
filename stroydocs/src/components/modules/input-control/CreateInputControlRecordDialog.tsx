'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createInputControlRecordSchema,
  type CreateInputControlRecordInput,
} from '@/lib/validations/input-control';
import { INPUT_CONTROL_RESULT_LABELS } from '@/utils/constants';
import { useInputControl } from './useInputControl';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
}

interface MaterialWithBatches {
  id: string;
  name: string;
  batches: { id: string; batchNumber: string; quantity: number }[];
}

export function CreateInputControlRecordDialog({ open, onOpenChange, contractId }: Props) {
  const { createMutation } = useInputControl(contractId);

  // Загружаем материалы с партиями для выбора
  const { data: materials = [] } = useQuery<MaterialWithBatches[]>({
    queryKey: ['materials-with-batches', contractId],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}/materials`);
      const json = await res.json();
      if (!json.success) return [];
      // Для каждого материала загружаем его партии
      const materialsData = json.data as { id: string; name: string }[];
      const results = await Promise.all(
        materialsData.map(async (m) => {
          const batchRes = await fetch(
            `/api/contracts/${contractId}/materials/${m.id}/batches`
          );
          const batchJson = await batchRes.json();
          return {
            id: m.id,
            name: m.name,
            batches: batchJson.success ? batchJson.data : [],
          };
        })
      );
      return results.filter((m) => m.batches.length > 0);
    },
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateInputControlRecordInput>({
    resolver: zodResolver(createInputControlRecordSchema),
    defaultValues: { result: 'CONFORMING' },
  });

  const onSubmit = (data: CreateInputControlRecordInput) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  // Формируем плоский список партий с названием материала
  const batchOptions = materials.flatMap((m) =>
    m.batches.map((b) => ({
      id: b.id,
      label: `${m.name} — Партия ${b.batchNumber} (${b.quantity})`,
    }))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать запись ЖВК</DialogTitle>
          <DialogDescription className="sr-only">Создайте запись журнала входного контроля для партии материала</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Партия материала *</Label>
            <Select onValueChange={(v) => setValue('batchId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите партию" />
              </SelectTrigger>
              <SelectContent>
                {batchOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.batchId && (
              <p className="text-sm text-destructive">{errors.batchId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Дата проверки *</Label>
              <Input type="date" {...register('date')} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Результат *</Label>
              <Select
                defaultValue="CONFORMING"
                onValueChange={(v) =>
                  setValue('result', v as CreateInputControlRecordInput['result'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INPUT_CONTROL_RESULT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Примечания</Label>
            <Textarea
              {...register('notes')}
              placeholder="Результаты визуального осмотра, замечания..."
              rows={3}
            />
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
