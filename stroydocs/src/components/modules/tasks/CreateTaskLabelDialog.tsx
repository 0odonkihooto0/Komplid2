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
import { useTaskGroups, useCreateTaskLabel } from './useTaskGroups';

const schema = z.object({
  name: z.string().min(1, 'Обязательное поле').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Некорректный цвет').default('#6366f1'),
  groupId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultGroupId?: string;
}

export function CreateTaskLabelDialog({ open, onOpenChange, defaultGroupId }: Props) {
  const { groups } = useTaskGroups();
  const createMutation = useCreateTaskLabel();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { color: '#6366f1' },
  });

  useEffect(() => {
    if (open) {
      reset({ name: '', color: '#6366f1', groupId: defaultGroupId ?? undefined });
    }
  }, [open, defaultGroupId, reset]);

  const groupId = watch('groupId');
  const color = watch('color');

  async function onSubmit(data: FormData) {
    await createMutation.mutateAsync({
      name: data.name,
      color: data.color,
      groupId: data.groupId,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Создать метку задач</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Название */}
          <div className="space-y-1.5">
            <Label htmlFor="label-name">Название *</Label>
            <Input id="label-name" placeholder="Название метки" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Цвет */}
          <div className="space-y-1.5">
            <Label htmlFor="label-color">Цвет</Label>
            <div className="flex items-center gap-3">
              <input
                id="label-color"
                type="color"
                value={color ?? '#6366f1'}
                onChange={(e) => setValue('color', e.target.value)}
                className="h-9 w-16 cursor-pointer rounded border border-input p-1"
              />
              <Input
                value={color ?? '#6366f1'}
                onChange={(e) => setValue('color', e.target.value)}
                className="font-mono text-sm"
                placeholder="#6366f1"
              />
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-gray-200"
                style={{ backgroundColor: color ?? '#6366f1' }}
              />
            </div>
            {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
          </div>

          {/* Группа (опционально) */}
          <div className="space-y-1.5">
            <Label>Группа задач (опционально)</Label>
            <Select
              value={groupId ?? 'NONE'}
              onValueChange={(v) => setValue('groupId', v === 'NONE' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Без группы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Без группы</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
