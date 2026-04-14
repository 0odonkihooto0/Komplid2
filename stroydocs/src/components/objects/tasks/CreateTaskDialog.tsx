'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useObjectContracts } from '@/components/modules/objects/useObjectContracts';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type Task,
  type CreateTaskData,
  type UpdateTaskData,
  type TaskPriority,
  type TaskStatus,
} from './useTasks';

interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
}

const schema = z.object({
  title: z.string().min(1, 'Укажите название задачи'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  deadline: z.string().optional(),
  assigneeId: z.string().optional(),
  contractId: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  editTask?: Task | null;
  onCreate: (data: CreateTaskData) => void;
  onUpdate: (id: string, data: UpdateTaskData) => void;
  isPending: boolean;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  editTask,
  onCreate,
  onUpdate,
  isPending,
}: CreateTaskDialogProps) {
  const { contracts } = useObjectContracts(projectId);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      if (!json.success) return [];
      return json.data;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Заполняем форму при редактировании
  useEffect(() => {
    if (editTask) {
      reset({
        title: editTask.title,
        description: editTask.description ?? '',
        priority: editTask.priority,
        deadline: editTask.deadline ? editTask.deadline.slice(0, 10) : '',
        assigneeId: editTask.assigneeId ?? '',
        contractId: editTask.contractId ?? '',
        status: editTask.status,
      });
    } else {
      reset({});
    }
  }, [editTask, reset]);

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset({});
    onOpenChange(isOpen);
  }

  function handleFormSubmit(values: FormValues) {
    if (editTask) {
      onUpdate(editTask.id, {
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        deadline: values.deadline || null,
        assigneeId: values.assigneeId || null,
        status: values.status,
      });
    } else {
      onCreate({
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        deadline: values.deadline || undefined,
        assigneeId: values.assigneeId || undefined,
        contractId: values.contractId || undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTask ? 'Редактировать задачу' : 'Создать задачу'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Название */}
          <div className="space-y-1">
            <Label>Название</Label>
            <Input {...register('title')} placeholder="Что нужно сделать?" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {/* Описание */}
          <div className="space-y-1">
            <Label>
              Описание <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Textarea {...register('description')} rows={3} placeholder="Детали задачи..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Приоритет */}
            <div className="space-y-1">
              <Label>Приоритет</Label>
              <Select
                defaultValue={editTask?.priority ?? 'MEDIUM'}
                onValueChange={(v) => setValue('priority', v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Срок */}
            <div className="space-y-1">
              <Label>
                Срок <span className="text-muted-foreground">(необязательно)</span>
              </Label>
              <Input {...register('deadline')} type="date" />
            </div>
          </div>

          {/* Исполнитель */}
          <div className="space-y-1">
            <Label>
              Исполнитель <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Select
              defaultValue={editTask?.assigneeId ?? 'NONE'}
              onValueChange={(v) => setValue('assigneeId', v === 'NONE' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не назначен" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Не назначен</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {[e.lastName, e.firstName].filter(Boolean).join(' ')}
                    {e.position ? ` (${e.position})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Контракт */}
          {!editTask && contracts.length > 0 && (
            <div className="space-y-1">
              <Label>
                Договор <span className="text-muted-foreground">(необязательно)</span>
              </Label>
              <Select onValueChange={(v) => setValue('contractId', v === 'NONE' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Без привязки к договору" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Без привязки</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Статус (только при редактировании) */}
          {editTask && (
            <div className="space-y-1">
              <Label>Статус</Label>
              <Select
                defaultValue={editTask.status}
                onValueChange={(v) => setValue('status', v as TaskStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение...' : editTask ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
