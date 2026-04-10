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
import type { ProjectIndicator, IndicatorFormData } from './useProjectIndicators';

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
  indicatorName: z.string().min(1, 'Введите наименование'),
  value: z.string().optional(),
  comment: z.string().optional(),
  maxValue: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator: ProjectIndicator | null;
  isPending: boolean;
  onSave: (id: string, payload: Partial<IndicatorFormData>) => void;
  onDelete: (id: string) => void;
}

export function EditIndicatorDialog({
  open, onOpenChange, indicator, isPending, onSave, onDelete,
}: Props) {
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

  // Заполняем форму при открытии
  useEffect(() => {
    if (open && indicator) {
      reset({
        groupName: indicator.groupName,
        indicatorName: indicator.indicatorName,
        value: indicator.value ?? '',
        comment: indicator.comment ?? '',
        maxValue: indicator.maxValue ?? '',
      });
    }
  }, [open, indicator, reset]);

  function onValid(values: FormValues) {
    if (!indicator) return;
    onSave(indicator.id, values);
  }

  function handleDelete() {
    if (!indicator) return;
    onDelete(indicator.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактировать показатель</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          {/* Группа */}
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

          {/* Наименование */}
          <div className="space-y-1">
            <Label className="text-xs">Наименование показателя *</Label>
            <Input {...register('indicatorName')} placeholder="Введите наименование" />
            {errors.indicatorName && (
              <p className="text-xs text-destructive">{errors.indicatorName.message}</p>
            )}
          </div>

          {/* Значение и макс. значение */}
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

          {/* Прикреплённые файлы */}
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

          {/* Футер: Удалить слева, Закрыть + Сохранить справа */}
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Удалить
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Закрыть
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Сохранение…' : 'Сохранить изменения'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
