'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateSchedule } from './useTaskSchedules';

const REPEAT_TYPES = [
  { value: 'DAY', label: 'День' },
  { value: 'WEEK', label: 'Неделя' },
  { value: 'MONTH', label: 'Месяц' },
  { value: 'YEAR', label: 'Год' },
] as const;

const WEEK_DAYS = [
  { day: 1, label: 'Пн' },
  { day: 2, label: 'Вт' },
  { day: 3, label: 'Ср' },
  { day: 4, label: 'Чт' },
  { day: 5, label: 'Пт' },
  { day: 6, label: 'Сб' },
  { day: 0, label: 'Вс' },
];

const schema = z.object({
  repeatType: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']).default('DAY'),
  interval: z.coerce.number().int().positive().default(1),
  startDate: z.string().min(1, 'Укажите дату начала'),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  createSubTasks: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templateId: string;
}

export function AddScheduleDialog({ open, onOpenChange, templateId }: Props) {
  const createMutation = useCreateSchedule();
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [monthDays, setMonthDays] = useState<number[]>([]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { repeatType: 'DAY', interval: 1, isActive: true, createSubTasks: false },
  });

  const repeatType = watch('repeatType');
  const isActive = watch('isActive');
  const createSubTasks = watch('createSubTasks');

  useEffect(() => {
    if (open) {
      reset({ repeatType: 'DAY', interval: 1, isActive: true, createSubTasks: false });
      setWeekDays([]);
      setMonthDays([]);
    }
  }, [open, reset]);

  function toggleWeekDay(day: number) {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function toggleMonthDay(day: number) {
    setMonthDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function onSubmit(data: FormData) {
    if (data.repeatType === 'WEEK' && weekDays.length === 0) return;
    if (data.repeatType === 'MONTH' && monthDays.length === 0) return;

    const startDate = new Date(data.startDate);
    startDate.setHours(9, 0, 0, 0);

    await createMutation.mutateAsync({
      templateId,
      repeatType: data.repeatType,
      interval: data.interval,
      weekDays: data.repeatType === 'WEEK' ? weekDays : [],
      monthDays: data.repeatType === 'MONTH' ? monthDays : [],
      startDate: startDate.toISOString(),
      endDate: data.endDate ? (() => {
        const d = new Date(data.endDate!);
        d.setHours(23, 59, 59, 999);
        return d.toISOString();
      })() : null,
      isActive: data.isActive,
      createSubTasks: data.createSubTasks,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Добавить расписание</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Повторяемость */}
          <div className="space-y-1.5">
            <Label>Повторяемость</Label>
            <Select
              value={repeatType}
              onValueChange={(v) => setValue('repeatType', v as FormData['repeatType'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPEAT_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Интервал */}
          <div className="space-y-1.5">
            <Label htmlFor="sched-interval">
              Повторять каждые
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="sched-interval"
                type="number"
                min={1}
                className="w-20"
                {...register('interval')}
              />
              <span className="text-sm text-gray-500">
                {repeatType === 'DAY' && 'дн'}
                {repeatType === 'WEEK' && 'нед'}
                {repeatType === 'MONTH' && 'мес'}
                {repeatType === 'YEAR' && 'лет'}
              </span>
            </div>
          </div>

          {/* Дни недели (только для WEEK) */}
          {repeatType === 'WEEK' && (
            <div className="space-y-1.5">
              <Label>Дни недели *</Label>
              <div className="flex gap-1">
                {WEEK_DAYS.map(({ day, label }) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekDay(day)}
                    className={cn(
                      'h-8 w-9 rounded border text-xs font-medium transition-colors',
                      weekDays.includes(day)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {weekDays.length === 0 && (
                <p className="text-xs text-destructive">Выберите хотя бы один день</p>
              )}
            </div>
          )}

          {/* Дни месяца (только для MONTH) */}
          {repeatType === 'MONTH' && (
            <div className="space-y-1.5">
              <Label>Дни месяца *</Label>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleMonthDay(day)}
                    className={cn(
                      'h-8 rounded border text-xs font-medium transition-colors',
                      monthDays.includes(day)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {monthDays.length === 0 && (
                <p className="text-xs text-destructive">Выберите хотя бы один день</p>
              )}
            </div>
          )}

          {/* Дата начала */}
          <div className="space-y-1.5">
            <Label htmlFor="sched-start">Начинать с *</Label>
            <Input id="sched-start" type="date" {...register('startDate')} />
            {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
          </div>

          {/* Дата окончания */}
          <div className="space-y-1.5">
            <Label htmlFor="sched-end">Повторять до</Label>
            <Input id="sched-end" type="date" {...register('endDate')} />
          </div>

          {/* Активно */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="sched-active" className="cursor-pointer">Активно</Label>
            <Switch
              id="sched-active"
              checked={isActive}
              onCheckedChange={(v) => setValue('isActive', v)}
            />
          </div>

          {/* Создавать подчинённые задачи */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="sched-sub" className="cursor-pointer">Создавать подчинённые задачи</Label>
            <Switch
              id="sched-sub"
              checked={createSubTasks}
              onCheckedChange={(v) => setValue('createSubTasks', v)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending ||
                (repeatType === 'WEEK' && weekDays.length === 0) ||
                (repeatType === 'MONTH' && monthDays.length === 0)}
            >
              {createMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
