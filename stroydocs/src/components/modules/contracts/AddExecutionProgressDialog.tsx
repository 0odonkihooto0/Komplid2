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
import { useExecutionProgress } from './useExecutionProgress';

const schema = z.object({
  date: z.string().min(1, 'Дата обязательна'),
  completionPercent: z.number().min(0).max(100).optional(),
  workersCount: z.number().int().min(0).optional(),
  equipmentCount: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
}

export function AddExecutionProgressDialog({ open, onOpenChange, projectId, contractId }: Props) {
  const { createMutation } = useExecutionProgress(projectId, contractId);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    await createMutation.mutateAsync({
      date: values.date,
      completionPercent: values.completionPercent,
      workersCount: values.workersCount,
      equipmentCount: values.equipmentCount,
      notes: values.notes || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить запись хода исполнения</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="date">Дата *</Label>
            <Input id="date" type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="completionPercent">% исполнения (0–100)</Label>
            <Input
              id="completionPercent"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="75.5"
              {...register('completionPercent', { valueAsNumber: true })}
            />
            {errors.completionPercent && (
              <p className="text-xs text-destructive">{errors.completionPercent.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="workersCount">Рабочих (чел.)</Label>
              <Input
                id="workersCount"
                type="number"
                min="0"
                placeholder="0"
                {...register('workersCount', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="equipmentCount">Техника (ед.)</Label>
              <Input
                id="equipmentCount"
                type="number"
                min="0"
                placeholder="0"
                {...register('equipmentCount', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Примечания</Label>
            <Input id="notes" placeholder="Примечания к записи" {...register('notes')} />
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
