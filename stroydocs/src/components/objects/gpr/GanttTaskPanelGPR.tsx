'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertTriangle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';
import { useUpdateTaskGPR, useDeleteTaskGPR } from './useGanttScheduleHooks';

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Не начата',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершена',
  DELAYED: 'Задержка',
  ON_HOLD: 'Приостановлена',
};

const schema = z.object({
  name: z.string().min(1),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ON_HOLD']),
  planStart: z.string(),
  planEnd: z.string(),
  factStart: z.string().optional(),
  factEnd: z.string().optional(),
  progress: z.number().min(0).max(100),
});

type FormData = z.infer<typeof schema>;

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

interface Props {
  task: GanttTaskItem;
  objectId: string;
  versionId: string;
  onClose: () => void;
  onExecDocsOpen?: () => void;
}

export function GanttTaskPanelGPR({ task, objectId, versionId, onClose, onExecDocsOpen }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updateTask = useUpdateTaskGPR(objectId, versionId);
  const deleteTask = useDeleteTaskGPR(objectId, versionId);

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: task.name,
      status: task.status as FormData['status'],
      planStart: toDateInput(task.planStart),
      planEnd: toDateInput(task.planEnd),
      factStart: toDateInput(task.factStart),
      factEnd: toDateInput(task.factEnd),
      progress: task.progress,
    },
  });

  useEffect(() => {
    reset({
      name: task.name,
      status: task.status as FormData['status'],
      planStart: toDateInput(task.planStart),
      planEnd: toDateInput(task.planEnd),
      factStart: toDateInput(task.factStart),
      factEnd: toDateInput(task.factEnd),
      progress: task.progress,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- сбрасываем только при смене задачи
  }, [task.id, reset]);

  const progress = watch('progress');

  function onSubmit(data: FormData) {
    updateTask.mutate(
      {
        taskId: task.id,
        data: {
          name: data.name,
          status: data.status,
          planStart: new Date(data.planStart).toISOString(),
          planEnd: new Date(data.planEnd).toISOString(),
          factStart: data.factStart ? new Date(data.factStart).toISOString() : null,
          factEnd: data.factEnd ? new Date(data.factEnd).toISOString() : null,
          progress: data.progress,
        },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="w-80 shrink-0 rounded-lg border bg-background shadow-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-medium text-sm">Задача</span>
        <div className="flex items-center gap-1">
          {task.isCritical && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="mr-1 h-3 w-3" aria-label="Критический путь" />
              КП
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Закрыть">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-4">
        <div className="space-y-1">
          <Label className="text-xs">Наименование</Label>
          <Input {...register('name')} className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Статус</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as FormData['status'])}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Начало план</Label>
            <Input type="date" {...register('planStart')} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Конец план</Label>
            <Input type="date" {...register('planEnd')} className="h-8 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Начало факт</Label>
            <Input type="date" {...register('factStart')} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Конец факт</Label>
            <Input type="date" {...register('factEnd')} className="h-8 text-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Прогресс</Label>
            <span className="text-xs font-medium">{Math.round(progress)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={progress}
            onChange={(e) => setValue('progress', parseInt(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {task.workItem && (
          <div className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            Вид работ: {task.workItem.projectCipher} {task.workItem.name}
          </div>
        )}

        {onExecDocsOpen && (
          <div className="flex items-center justify-between rounded border px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">ИД</span>
              <span className="font-medium">{task.linkedExecutionDocsCount ?? 0}</span>
            </div>
            <button
              type="button"
              onClick={onExecDocsOpen}
              className="text-xs text-primary hover:underline"
            >
              Открыть
            </button>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" className="flex-1" disabled={updateTask.isPending}>
            Сохранить
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Удалить
          </Button>
        </div>
      </form>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={task.name}
        warningText="Дочерние задачи тоже будут удалены."
        isPending={deleteTask.isPending}
        onConfirm={() => {
          deleteTask.mutate(task.id, { onSuccess: onClose });
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}
