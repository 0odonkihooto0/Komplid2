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
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { DailyLogItem } from './useDailyLogs';

const WEATHER_OPTIONS = [
  { value: 'ясно', label: '☀️ Ясно' },
  { value: 'облачно', label: '⛅ Облачно' },
  { value: 'пасмурно', label: '☁️ Пасмурно' },
  { value: 'дождь', label: '🌧️ Дождь' },
  { value: 'снег', label: '❄️ Снег' },
  { value: 'мороз', label: '🥶 Мороз' },
];

const schema = z.object({
  date: z.string().min(1, 'Укажите дату'),
  weather: z.string().optional(),
  temperature: z.string().optional(),
  workersCount: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editLog?: DailyLogItem | null;
  onSubmit: (data: {
    date: string;
    weather?: string;
    temperature?: number;
    workersCount?: number;
    notes?: string;
  }) => void;
  isPending?: boolean;
}

export function DailyLogFormDialog({ open, onOpenChange, editLog, onSubmit, isPending }: Props) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      weather: '',
      temperature: '',
      workersCount: '',
      notes: '',
    },
  });

  const weatherValue = watch('weather');

  useEffect(() => {
    if (editLog) {
      reset({
        date: editLog.date.slice(0, 10),
        weather: editLog.weather ?? '',
        temperature: editLog.temperature != null ? String(editLog.temperature) : '',
        workersCount: editLog.workersCount != null ? String(editLog.workersCount) : '',
        notes: editLog.notes ?? '',
      });
    } else {
      reset({
        date: new Date().toISOString().slice(0, 10),
        weather: '',
        temperature: '',
        workersCount: '',
        notes: '',
      });
    }
  }, [editLog, reset]);

  function handleFormSubmit(values: FormValues) {
    onSubmit({
      date: values.date,
      weather: values.weather || undefined,
      temperature: values.temperature ? Number(values.temperature) : undefined,
      workersCount: values.workersCount ? Number(values.workersCount) : undefined,
      notes: values.notes || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editLog ? 'Редактировать запись' : 'Отметить день'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Дата</Label>
            <Input id="date" type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Погода</Label>
              <Select
                value={weatherValue}
                onValueChange={(v) => setValue('weather', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  {WEATHER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Температура (°C)</Label>
              <Input id="temperature" type="number" placeholder="-5" {...register('temperature')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workersCount">Рабочих на объекте</Label>
            <Input id="workersCount" type="number" min="0" placeholder="0" {...register('workersCount')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              placeholder="Описание выполненных работ, происшествий, замечаний..."
              rows={3}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
