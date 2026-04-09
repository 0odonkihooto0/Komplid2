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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GanttTaskItem } from './ganttTypes';
import { useCreateTask } from './useGanttTasks';

const schema = z.object({
  name: z.string().min(1, 'Обязательное поле').max(500),
  level: z.enum(['0', '1']),
  parentId: z.string().optional(),
  planStart: z.string().min(1, 'Обязательное поле'),
  planEnd: z.string().min(1, 'Обязательное поле'),
  workItemId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
  versionId: string;
  parentTasks: GanttTaskItem[];
}

export function CreateGanttTaskDialog({
  open,
  onOpenChange,
  projectId,
  contractId,
  versionId,
  parentTasks,
}: Props) {
  const createTask = useCreateTask(projectId, contractId, versionId);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { level: '0' },
  });

  const level = watch('level');

  function onSubmit(data: FormData) {
    createTask.mutate(
      {
        name: data.name,
        planStart: new Date(data.planStart).toISOString(),
        planEnd: new Date(data.planEnd).toISOString(),
        parentId: data.level === '1' ? data.parentId : undefined,
        level: parseInt(data.level),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Наименование *</Label>
            <Input {...register('name')} placeholder="Например: Монолитные работы" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Уровень</Label>
            <Select value={level} onValueChange={(v) => setValue('level', v as '0' | '1')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Раздел</SelectItem>
                <SelectItem value="1">Работа</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {level === '1' && parentTasks.length > 0 && (
            <div className="space-y-1">
              <Label>Родительская задача</Label>
              <Select onValueChange={(v) => setValue('parentId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите раздел" />
                </SelectTrigger>
                <SelectContent>
                  {parentTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Начало план *</Label>
              <Input type="date" {...register('planStart')} />
              {errors.planStart && <p className="text-xs text-destructive">{errors.planStart.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Окончание план *</Label>
              <Input type="date" {...register('planEnd')} />
              {errors.planEnd && <p className="text-xs text-destructive">{errors.planEnd.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              Отмена
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
