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
import { useDetailInfo } from './useDetailInfo';

const schema = z.object({
  fieldName: z.string().min(1, 'Обязательное поле'),
  fieldValue: z.string().optional(),
});

type FormInput = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
}

export function AddDetailInfoDialog({ open, onOpenChange, projectId, contractId }: Props) {
  const { createMutation } = useDetailInfo(projectId, contractId);

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { fieldName: '', fieldValue: '' },
  });

  function onSubmit(data: FormInput) {
    createMutation.mutate(
      { fieldName: data.fieldName, fieldValue: data.fieldValue },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  }

  function handleOpenChange(v: boolean) {
    if (!v) form.reset();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить сведение</DialogTitle>
          <DialogDescription className="sr-only">
            Добавьте произвольное поле к договору
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Наименование поля</Label>
            <Input
              placeholder="Например: Реквизиты банка"
              {...form.register('fieldName')}
            />
            {form.formState.errors.fieldName && (
              <p className="text-xs text-destructive">
                {form.formState.errors.fieldName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Значение</Label>
            <Input
              placeholder="Например: ПАО Сбербанк, р/с 40702..."
              {...form.register('fieldValue')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
