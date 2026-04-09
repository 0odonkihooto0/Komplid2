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
import { Button } from '@/components/ui/button';
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
import {
  useEventMutations,
  type ProjectEvent,
  type ProjectEventType,
} from './useProjectEvents';
import { useManagementContracts } from './useManagementContracts';

// ─────────────────────────────────────────────
// Константы
// ─────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<ProjectEventType, string> = {
  MEETING: 'Совещание',
  GSN_INSPECTION: 'Проверка ГСН',
  ACCEPTANCE: 'Приёмка',
  AUDIT: 'Аудит',
  COMMISSIONING: 'Сдача в эксплуатацию',
  OTHER: 'Прочее',
};

const schema = z.object({
  title: z.string().min(1, 'Название обязательно').max(255),
  eventType: z.enum(['MEETING', 'GSN_INSPECTION', 'ACCEPTANCE', 'AUDIT', 'COMMISSIONING', 'OTHER']),
  scheduledAt: z.string().min(1, 'Дата обязательна'),
  location: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  contractId: z.string().optional(),
  notifyDays: z.number().int().min(0).max(30),
});

type FormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────
// Компонент
// ─────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  event?: ProjectEvent | null; // Режим редактирования
}

export function CreateEventDialog({ open, onOpenChange, projectId, event }: Props) {
  const isEdit = !!event;
  const { createEvent, updateEvent } = useEventMutations(projectId);
  const { allContracts } = useManagementContracts(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      eventType: 'MEETING',
      scheduledAt: '',
      location: '',
      description: '',
      contractId: '',
      notifyDays: 3,
    },
  });

  // Заполнить форму при редактировании
  useEffect(() => {
    if (event && open) {
      // Привести ISO-дату к формату datetime-local (yyyy-MM-ddTHH:mm)
      const localDt = new Date(event.scheduledAt).toISOString().slice(0, 16);
      form.reset({
        title: event.title,
        eventType: event.eventType,
        scheduledAt: localDt,
        location: event.location ?? '',
        description: event.description ?? '',
        contractId: event.contractId ?? '',
        notifyDays: event.notifyDays,
      });
    } else if (!event && open) {
      form.reset({
        title: '',
        eventType: 'MEETING',
        scheduledAt: '',
        location: '',
        description: '',
        contractId: '',
        notifyDays: 3,
      });
    }
  }, [event, open, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      contractId: values.contractId || undefined,
      location: values.location || undefined,
      description: values.description || undefined,
    };

    if (isEdit && event) {
      await updateEvent.mutateAsync({ eventId: event.id, data: payload });
    } else {
      await createEvent.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createEvent.isPending || updateEvent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать мероприятие' : 'Новое мероприятие'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Название */}
          <div className="space-y-1">
            <Label htmlFor="title">Название *</Label>
            <Input id="title" {...form.register('title')} placeholder="Название мероприятия" />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Тип мероприятия */}
          <div className="space-y-1">
            <Label>Тип *</Label>
            <Select
              value={form.watch('eventType')}
              onValueChange={(v) => form.setValue('eventType', v as ProjectEventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(EVENT_TYPE_LABELS) as [ProjectEventType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Дата и время */}
          <div className="space-y-1">
            <Label htmlFor="scheduledAt">Дата и время *</Label>
            <Input id="scheduledAt" type="datetime-local" {...form.register('scheduledAt')} />
            {form.formState.errors.scheduledAt && (
              <p className="text-xs text-destructive">
                {form.formState.errors.scheduledAt.message}
              </p>
            )}
          </div>

          {/* Место */}
          <div className="space-y-1">
            <Label htmlFor="location">Место проведения</Label>
            <Input id="location" {...form.register('location')} placeholder="Адрес или название" />
          </div>

          {/* Договор */}
          <div className="space-y-1">
            <Label>Привязать к договору</Label>
            <Select
              value={form.watch('contractId') ?? ''}
              onValueChange={(v) => form.setValue('contractId', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не выбран" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не выбран</SelectItem>
                {allContracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.number} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Описание */}
          <div className="space-y-1">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Повестка или комментарий"
              rows={3}
            />
          </div>

          {/* Напомнить за N дней */}
          <div className="space-y-1">
            <Label htmlFor="notifyDays">Напомнить за (дней)</Label>
            <Input
              id="notifyDays"
              type="number"
              min={0}
              max={30}
              {...form.register('notifyDays', { valueAsNumber: true })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
