'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EditTaskFormData } from './GanttTaskEditDialog';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Не начата',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершена',
  DELAYED: 'Задержка',
  ON_HOLD: 'Приостановлена',
};

const VOLUME_UNITS = ['%', 'м³', 'шт', 'компл', 'м', 'м²', 'т', 'п.м.'];

interface Props {
  form: UseFormReturn<EditTaskFormData>;
  contracts: { id: string; number: string; name: string }[];
  contractsLoading: boolean;
  parentOptions: GanttTaskItem[];
  taskId: string;
}

export function GanttTaskMainTab({ form, contracts, contractsLoading, parentOptions, taskId }: Props) {
  const { register, watch, setValue } = form;
  const isCritical = watch('isCritical');
  const isMilestone = watch('isMilestone');

  return (
    <div className="space-y-3">
      {/* Наименование */}
      <div className="space-y-1">
        <Label className="text-xs">Наименование *</Label>
        <Input {...register('name')} className="h-8 text-sm" />
      </div>

      {/* Категория / Родительская задача */}
      <div className="space-y-1">
        <Label className="text-xs">Категория (родительская задача)</Label>
        <Select
          value={watch('parentId') ?? '__none__'}
          onValueChange={(v) => setValue('parentId', v === '__none__' ? null : v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="— нет родителя —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— нет родителя —</SelectItem>
            {parentOptions.filter((t) => t.id !== taskId).map((t) => (
              <SelectItem key={t.id} value={t.id} className="text-xs">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Вид работ */}
      <div className="space-y-1">
        <Label className="text-xs">Вид работ</Label>
        <Input {...register('workType')} className="h-8 text-sm" placeholder="Введите вид работ" />
      </div>

      {/* Контракт задачи */}
      <div className="space-y-1">
        <Label className="text-xs">Контракт задачи</Label>
        <Select
          value={watch('taskContractId') ?? '__none__'}
          onValueChange={(v) => setValue('taskContractId', v === '__none__' ? null : v)}
          disabled={contractsLoading}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={contractsLoading ? 'Загрузка...' : '— не указан —'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— не указан —</SelectItem>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.number} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Объём + Единицы */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Объём</Label>
          <Input
            type="number"
            step="any"
            {...register('volume', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Единицы</Label>
          <Select
            value={watch('volumeUnit') ?? '__none__'}
            onValueChange={(v) => setValue('volumeUnit', v === '__none__' ? null : v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="— ед. —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {VOLUME_UNITS.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Сумма + Сумма НДС */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Сумма</Label>
          <Input
            type="number"
            step="any"
            {...register('amount', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Сумма НДС</Label>
          <Input
            type="number"
            step="any"
            {...register('amountVat', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Вес */}
      <div className="space-y-1">
        <Label className="text-xs">Вес</Label>
        <Input
          type="number"
          step="any"
          min={0}
          {...register('weight', { valueAsNumber: true })}
          className="h-8 text-sm"
        />
      </div>

      {/* Чел. часы + Маш. часы */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Чел. часы</Label>
          <Input
            type="number"
            step="any"
            {...register('manHours', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Маш. часы</Label>
          <Input
            type="number"
            step="any"
            {...register('machineHours', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Крайний срок */}
      <div className="space-y-1">
        <Label className="text-xs">Крайний срок</Label>
        <Input type="date" {...register('deadline')} className="h-8 text-sm" />
      </div>

      {/* Статус */}
      <div className="space-y-1">
        <Label className="text-xs">Статус</Label>
        <Select
          value={watch('status')}
          onValueChange={(v) => setValue('status', v as EditTaskFormData['status'])}
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

      {/* Прогресс */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Прогресс</Label>
          <span className="text-xs font-medium">{Math.round(watch('progress'))}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={watch('progress')}
          onChange={(e) => setValue('progress', parseInt(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {/* Флаги */}
      <div className="flex gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={isCritical}
            onCheckedChange={(c) => setValue('isCritical', c === true)}
          />
          <span className="text-xs">Критичная</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={isMilestone}
            onCheckedChange={(c) => setValue('isMilestone', c === true)}
          />
          <span className="text-xs">Веха</span>
        </label>
      </div>
    </div>
  );
}
