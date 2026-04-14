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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreatePlannerTask,
  useUpdatePlannerTask,
  type PlannerTask,
} from './usePlannerTasks';
import { usePlannerVersions } from './usePlannerVersions';

const schema = z.object({
  title: z.string().min(1, 'Обязательное поле').max(300),
  description: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  deadline: z.string().optional(),
  assigneeId: z.string().optional(),
  parentTaskId: z.string().optional(),
  versionId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const PRIORITY_LABELS: Record<FormValues['priority'], string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  CRITICAL: 'Критичный',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  versionId?: string | null;
  tasks: PlannerTask[];
  mode: 'create' | 'edit';
  initialTask?: PlannerTask | null;
  defaultParentId?: string;
}

export function CreatePlannerTaskDialog({
  open,
  onOpenChange,
  projectId,
  versionId,
  tasks,
  mode,
  initialTask,
  defaultParentId,
}: Props) {
  const createMutation = useCreatePlannerTask(projectId);
  const updateMutation = useUpdatePlannerTask(projectId);
  const { versions } = usePlannerVersions(projectId);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      deadline: '',
      assigneeId: undefined,
      parentTaskId: defaultParentId ?? undefined,
      versionId: versionId ?? undefined,
    },
  });

  // Сбрасываем форму при открытии: заполняем данными задачи при редактировании
  // или чистим при создании
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialTask) {
        reset({
          title: initialTask.title,
          description: initialTask.description ?? '',
          priority: initialTask.priority,
          deadline: initialTask.deadline ? initialTask.deadline.split('T')[0] : '',
          assigneeId: initialTask.assigneeId ?? undefined,
          parentTaskId: initialTask.parentTaskId ?? undefined,
          versionId: initialTask.versionId ?? undefined,
        });
      } else {
        reset({
          title: '',
          description: '',
          priority: 'MEDIUM',
          deadline: '',
          assigneeId: undefined,
          parentTaskId: defaultParentId ?? undefined,
          versionId: versionId ?? undefined,
        });
      }
    }
  }, [open, mode, initialTask, defaultParentId, versionId, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined,
      assigneeId: values.assigneeId || undefined,
      parentTaskId: values.parentTaskId || undefined,
      versionId: values.versionId || undefined,
    };

    if (mode === 'edit' && initialTask) {
      await updateMutation.mutateAsync({ taskId: initialTask.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Редактировать задачу' : 'Создать задачу'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Название */}
          <div className="space-y-1">
            <Label>Название</Label>
            <Input {...register('title')} placeholder="Что нужно сделать?" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Описание */}
          <div className="space-y-1">
            <Label>
              Описание{' '}
              <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Textarea
              {...register('description')}
              rows={3}
              placeholder="Детали задачи..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Приоритет */}
            <div className="space-y-1">
              <Label>Приоритет</Label>
              <Select
                defaultValue={initialTask?.priority ?? 'MEDIUM'}
                onValueChange={(v) => setValue('priority', v as FormValues['priority'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as FormValues['priority'][]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Срок */}
            <div className="space-y-1">
              <Label>
                Срок{' '}
                <span className="text-muted-foreground">(необязательно)</span>
              </Label>
              <Input {...register('deadline')} type="date" />
            </div>
          </div>

          {/* Родительская задача */}
          <div className="space-y-1">
            <Label>
              Родительская задача{' '}
              <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Select
              defaultValue={defaultParentId ?? initialTask?.parentTaskId ?? 'NONE'}
              onValueChange={(v) => setValue('parentTaskId', v === 'NONE' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Без родителя" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Без родителя</SelectItem>
                {/* Отступ отражает уровень вложенности задачи в дереве */}
                {tasks
                  .filter((t) => t.id !== initialTask?.id)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {'—'.repeat(t.level)} {t.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Версия УП */}
          <div className="space-y-1">
            <Label>
              Версия УП{' '}
              <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Select
              defaultValue={versionId ?? initialTask?.versionId ?? 'NONE'}
              onValueChange={(v) => setValue('versionId', v === 'NONE' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Без версии" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Без версии</SelectItem>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                    {v.isCurrent ? ' (текущая)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение...' : mode === 'edit' ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
