'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTaskGroups } from './useTaskGroups';
import { useCreateTaskTemplate, useTaskTemplates } from './useTaskTemplates';

const DURATION_UNITS = [
  { value: 'hours', label: 'ч' },
  { value: 'days', label: 'дн' },
] as const;

const PRIORITIES = [
  { value: 'LOW', label: 'Низкий' },
  { value: 'MEDIUM', label: 'Обычный' },
  { value: 'HIGH', label: 'Высокий' },
] as const;

const schema = z.object({
  name: z.string().min(1, 'Название обязательно').max(300),
  description: z.string().max(5000).optional(),
  typeId: z.string().optional(),
  groupId: z.string().optional(),
  parentTemplateId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  durationValue: z.coerce.number().int().positive().nullable().optional(),
  durationUnit: z.enum(['hours', 'days']).default('hours'),
});

type FormData = z.infer<typeof schema>;

interface TaskType {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateTaskTemplateDialog({ open, onOpenChange }: Props) {
  const { groups } = useTaskGroups();
  const { templates: parentTemplates } = useTaskTemplates({ parentTemplateId: null });
  const createMutation = useCreateTaskTemplate();
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours');

  const { data: taskTypes } = useQuery<TaskType[]>({
    queryKey: ['task-types'],
    queryFn: async () => {
      const res = await fetch('/api/task-types');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TaskType[];
    },
    staleTime: 60_000,
  });

  const {
    register, handleSubmit, setValue, watch, reset, formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'MEDIUM', durationUnit: 'hours' },
  });

  const typeId = watch('typeId');
  const groupId = watch('groupId');
  const parentTemplateId = watch('parentTemplateId');
  const priority = watch('priority');

  useEffect(() => {
    if (open) {
      reset({ priority: 'MEDIUM', durationUnit: 'hours' });
      setDurationUnit('hours');
    }
  }, [open, reset]);

  async function onSubmit(data: FormData) {
    let duration: number | null = null;
    if (data.durationValue) {
      duration = data.durationUnit === 'days'
        ? data.durationValue * 1440
        : data.durationValue * 60;
    }

    await createMutation.mutateAsync({
      name: data.name,
      description: data.description || undefined,
      typeId: data.typeId || null,
      groupId: data.groupId || null,
      parentTemplateId: data.parentTemplateId || null,
      priority: data.priority,
      duration,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Создать шаблон задачи</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Название */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Название *</Label>
            <Input id="tpl-name" placeholder="Название шаблона" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Описание */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">Описание</Label>
            <Textarea id="tpl-desc" placeholder="Описание задачи..." rows={3} {...register('description')} />
          </div>

          {/* Тип */}
          <div className="space-y-1.5">
            <Label>Тип задачи</Label>
            <Select
              value={typeId ?? 'NONE'}
              onValueChange={(v) => setValue('typeId', v === 'NONE' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не указан" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Не указан</SelectItem>
                {(taskTypes ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Нет нужного типа?{' '}
              <span className="text-blue-600">Запросите у техподдержки</span>
            </p>
          </div>

          {/* Группа */}
          <div className="space-y-1.5">
            <Label>Группа задач</Label>
            <Select
              value={groupId ?? 'NONE'}
              onValueChange={(v) => setValue('groupId', v === 'NONE' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не указана" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Не указана</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Шаблон-основание (для подзадач) */}
          <div className="space-y-1.5">
            <Label>Шаблон-основание</Label>
            <Select
              value={parentTemplateId ?? 'NONE'}
              onValueChange={(v) => setValue('parentTemplateId', v === 'NONE' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Нет (корневой шаблон)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Нет (корневой шаблон)</SelectItem>
                {parentTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Приоритет */}
          <div className="space-y-1.5">
            <Label>Приоритет</Label>
            <Select
              value={priority}
              onValueChange={(v) => setValue('priority', v as 'LOW' | 'MEDIUM' | 'HIGH')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Длительность */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-duration">Длительность</Label>
            <div className="flex gap-2">
              <Input
                id="tpl-duration"
                type="number"
                min={1}
                placeholder="—"
                className="flex-1"
                {...register('durationValue')}
              />
              <Select
                value={durationUnit}
                onValueChange={(v) => {
                  const unit = v as 'hours' | 'days';
                  setDurationUnit(unit);
                  setValue('durationUnit', unit);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать шаблон'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
