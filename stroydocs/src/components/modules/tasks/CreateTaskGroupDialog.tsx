'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTaskGroups, useCreateTaskGroup } from './useTaskGroups';

const schema = z.object({
  name: z.string().min(1, 'Обязательное поле').max(100),
  parentId: z.string().optional(),
  visibility: z.enum(['EVERYONE', 'SELECTED'] as const),
  order: z.coerce.number().int().min(0).default(0),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultParentId?: string;
}

export function CreateTaskGroupDialog({ open, onOpenChange, defaultParentId }: Props) {
  const { groups } = useTaskGroups();
  const createMutation = useCreateTaskGroup();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { visibility: 'EVERYONE', order: 0 },
  });

  // При открытии сброс формы и установка parent
  useEffect(() => {
    if (open) {
      reset({ name: '', parentId: defaultParentId ?? undefined, visibility: 'EVERYONE', order: 0 });
    }
  }, [open, defaultParentId, reset]);

  const visibility = watch('visibility');
  const parentId = watch('parentId');

  async function onSubmit(data: FormData) {
    await createMutation.mutateAsync({
      name: data.name,
      parentId: data.parentId,
      visibility: data.visibility,
      order: data.order,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Создать группу задач</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Родительская группа */}
          <div className="space-y-1.5">
            <Label>Группа задач (родитель)</Label>
            <Select
              value={parentId ?? 'NONE'}
              onValueChange={(v) => setValue('parentId', v === 'NONE' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Верхний уровень" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Верхний уровень</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Наименование */}
          <div className="space-y-1.5">
            <Label htmlFor="group-name">Наименование *</Label>
            <Input id="group-name" placeholder="Название группы" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Видимость */}
          <div className="space-y-1.5">
            <Label>Видно</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setValue('visibility', v as 'EVERYONE' | 'SELECTED')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EVERYONE">Всем</SelectItem>
                <SelectItem value="SELECTED">Выбранным людям</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Порядок */}
          <div className="space-y-1.5">
            <Label htmlFor="group-order">Порядок</Label>
            <Input id="group-order" type="number" min={0} {...register('order')} />
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
