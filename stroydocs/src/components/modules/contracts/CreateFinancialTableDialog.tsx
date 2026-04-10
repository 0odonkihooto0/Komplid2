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
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFinancialTables, type FinancialTableItem } from './useFinancialTables';

const schema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200, 'Максимум 200 символов'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
  onCreated?: (tableId: string) => void;
}

export function CreateFinancialTableDialog({
  open,
  onOpenChange,
  projectId,
  contractId,
  onCreated,
}: Props) {
  const { createMutation } = useFinancialTables(projectId, contractId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  function onSubmit(data: FormValues) {
    createMutation.mutate(data.name, {
      onSuccess: (created: FinancialTableItem) => {
        form.reset();
        onOpenChange(false);
        onCreated?.(created.id);
      },
    });
  }

  function handleOpenChange(v: boolean) {
    if (!v) form.reset();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая финансовая таблица</DialogTitle>
          <DialogDescription className="sr-only">
            Введите название таблицы
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table-name">Название</Label>
            <Input
              id="table-name"
              placeholder="Например: Финансирование по годам"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
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
