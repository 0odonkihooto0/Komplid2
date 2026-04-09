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
import { useKs2List } from './useKs2';

const schema = z.object({
  periodStart: z.string().min(1, 'Укажите дату начала'),
  periodEnd: z.string().min(1, 'Укажите дату окончания'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
}

/** Диалог создания акта КС-2 */
export function CreateKs2Dialog({ open, onOpenChange, projectId, contractId }: Props) {
  const { createMutation } = useKs2List(projectId, contractId);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync({
      periodStart: new Date(data.periodStart).toISOString(),
      periodEnd: new Date(data.periodEnd).toISOString(),
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Создать акт КС-2</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="periodStart">Начало отчётного периода</Label>
            <Input
              id="periodStart"
              type="date"
              {...form.register('periodStart')}
            />
            {form.formState.errors.periodStart && (
              <p className="text-xs text-destructive">{form.formState.errors.periodStart.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="periodEnd">Конец отчётного периода</Label>
            <Input
              id="periodEnd"
              type="date"
              {...form.register('periodEnd')}
            />
            {form.formState.errors.periodEnd && (
              <p className="text-xs text-destructive">{form.formState.errors.periodEnd.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
