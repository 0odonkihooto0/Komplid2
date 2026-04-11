'use client';

import { useEffect } from 'react';
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useObligations, type ContractObligation } from './useObligations';

const obligationSchema = z.object({
  description: z.string().min(1, 'Обязательное поле'),
  amount: z.number().optional(),
  deadline: z.string().optional(),
  status: z.string(),
});

type ObligationFormValues = z.infer<typeof obligationSchema>;

interface AddObligationDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
  initialValues?: Partial<ContractObligation>;
}

export function AddObligationDialog({
  open,
  onOpenChange,
  projectId,
  contractId,
  initialValues,
}: AddObligationDialogProps) {
  const { createMutation, updateMutation } = useObligations(projectId, contractId);

  const form = useForm<ObligationFormValues>({
    resolver: zodResolver(obligationSchema),
    defaultValues: {
      description: initialValues?.description ?? '',
      amount: initialValues?.amount ?? undefined,
      deadline: initialValues?.deadline ?? '',
      status: initialValues?.status ?? 'ACTIVE',
    },
  });

  // Синхронизируем форму при изменении initialValues
  useEffect(() => {
    if (open) {
      form.reset({
        description: initialValues?.description ?? '',
        amount: initialValues?.amount ?? undefined,
        deadline: initialValues?.deadline ?? '',
        status: initialValues?.status ?? 'ACTIVE',
      });
    }
  }, [open, initialValues, form]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: ObligationFormValues) => {
    if (initialValues?.id) {
      await updateMutation.mutateAsync({ id: initialValues.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
    form.reset();
    onOpenChange(false);
  };

  const isEdit = Boolean(initialValues?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать обязательство' : 'Добавить обязательство'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Измените данные обязательства по контракту'
              : 'Заполните данные нового обязательства по контракту'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Описание */}
          <div className="space-y-1">
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              placeholder="Описание обязательства"
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Сумма */}
          <div className="space-y-1">
            <Label htmlFor="amount">Сумма (₽)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              {...form.register('amount', { valueAsNumber: true })}
            />
          </div>

          {/* Срок исполнения */}
          <div className="space-y-1">
            <Label htmlFor="deadline">Срок исполнения</Label>
            <Input id="deadline" type="date" {...form.register('deadline')} />
          </div>

          {/* Статус */}
          <div className="space-y-1">
            <Label htmlFor="status">Статус</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(val) => form.setValue('status', val)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Активно</SelectItem>
                <SelectItem value="COMPLETED">Выполнено</SelectItem>
                <SelectItem value="OVERDUE">Просрочено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
