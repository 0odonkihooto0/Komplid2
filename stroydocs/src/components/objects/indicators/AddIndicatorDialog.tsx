'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { IndicatorFormData } from './useProjectIndicators';

const INDICATOR_GROUPS = [
  'Общая информация',
  'Градостроительная проработка',
  'Информация по СМР и АВР',
  'Структура капитальных затрат',
  'Статус реализации',
  'Контракты ПИР',
  'Данные по контрактам СК и СМР',
  'ТУ для строительства',
] as const;

const schema = z.object({
  groupName: z.string().min(1, 'Выберите группу'),
  indicatorName: z.string().min(1, 'Введите наименование показателя'),
  value: z.string().optional(),
  comment: z.string().optional(),
  maxValue: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (data: IndicatorFormData) => void;
}

export function AddIndicatorDialog({ open, onOpenChange, isPending, onSubmit }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const groupName = watch('groupName');

  useEffect(() => {
    if (open) reset({ groupName: '', indicatorName: '', value: '', comment: '', maxValue: '' });
  }, [open, reset]);

  function onValid(values: FormValues) {
    // Файлы в этом MVP не загружаются через S3 при создании — fileKeys добавляются при необходимости
    onSubmit({ ...values, fileKeys: [] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить показатель</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          {/* Группа (вид информации) */}
          <div className="space-y-1">
            <Label className="text-xs">Вид информации *</Label>
            <Select onValueChange={(v) => setValue('groupName', v)} value={groupName ?? ''}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите группу..." />
              </SelectTrigger>
              <SelectContent>
                {INDICATOR_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.groupName && (
              <p className="text-xs text-destructive">{errors.groupName.message}</p>
            )}
          </div>

          {/* Наименование показателя */}
          <div className="space-y-1">
            <Label className="text-xs">Наименование показателя *</Label>
            <Input {...register('indicatorName')} placeholder="Введите наименование" />
            {errors.indicatorName && (
              <p className="text-xs text-destructive">{errors.indicatorName.message}</p>
            )}
          </div>

          {/* Значение и макс. значение в одной строке */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Значение</Label>
              <Input {...register('value')} placeholder="Например: 1 500 000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Макс. значение</Label>
              <Input {...register('maxValue')} placeholder="Плановое значение" />
            </div>
          </div>

          {/* Комментарий */}
          <div className="space-y-1">
            <Label className="text-xs">Комментарий</Label>
            <Textarea {...register('comment')} placeholder="Дополнительная информация" rows={3} />
          </div>

          {/* Прикреплённые файлы (визуальный элемент, S3-загрузка — будущий этап) */}
          <div className="space-y-1">
            <Label className="text-xs">Прикреплённые файлы</Label>
            <div
              className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-muted-foreground/40 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/70"
              onClick={() => fileInputRef.current?.click()}
            >
              Нажмите для выбора файлов
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Создание…' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
