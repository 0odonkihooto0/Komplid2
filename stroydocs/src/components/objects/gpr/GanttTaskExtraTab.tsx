'use client';

import { useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { UseMutationResult } from '@tanstack/react-query';
import { Paperclip, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EditTaskFormData } from './GanttTaskEditDialog';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';

const COST_TYPE_LABELS: Record<string, string> = {
  CONSTRUCTION: 'Строительные',
  MOUNTING: 'Монтажные',
  EQUIPMENT: 'Оборудование',
  OTHER: 'Прочее',
};

const MATERIAL_DIST_LABELS: Record<string, string> = {
  UNIFORM: 'Равномерное',
  PER_UNIT: 'Поштучно',
  FIRST_DAY: 'В первый день',
  LAST_DAY: 'В последний день',
};

const CALC_TYPE_LABELS: Record<string, string> = {
  DEFAULT: 'По умолчанию',
  VOLUME: 'Объём',
  AMOUNT: 'Суммы',
  MAN_HOURS: 'Человеко-часы',
  MACHINE_HOURS: 'Машино-часы',
  LABOR: 'Трудовые ресурсы',
};

interface Props {
  form: UseFormReturn<EditTaskFormData>;
  task: GanttTaskItem;
  objectId: string;
  versionId: string;
  uploadAttachment: UseMutationResult<{ s3Key: string; attachmentS3Keys: string[] }, Error, File>;
  removeAttachment: UseMutationResult<{ attachmentS3Keys: string[] }, Error, string>;
}

export function GanttTaskExtraTab({
  form,
  task,
  uploadAttachment,
  removeAttachment,
}: Props) {
  const { register, watch, setValue } = form;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadAttachment.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Получаем имя файла из S3-ключа (последний сегмент после /)
  function fileNameFromKey(key: string): string {
    const parts = key.split('/');
    const last = parts.at(-1) ?? key;
    // Убираем префикс timestamp_ (формат: 1234567890_filename.ext)
    return last.replace(/^\d+_/, '');
  }

  return (
    <div className="space-y-3">
      {/* Тип стоимости */}
      <div className="space-y-1">
        <Label className="text-xs">Тип стоимости</Label>
        <Select
          value={watch('costType') ?? '__none__'}
          onValueChange={(v) =>
            setValue('costType', v === '__none__' ? null : (v as EditTaskFormData['costType']))
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="— не указан —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— не указан —</SelectItem>
            {Object.entries(COST_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Основание */}
      <div className="space-y-1">
        <Label className="text-xs">Основание (ссылка на смету)</Label>
        <Input {...register('basis')} className="h-8 text-sm" placeholder="Например: Смета №12, поз. 3.4" />
      </div>

      {/* Характер распределения */}
      <div className="space-y-1">
        <Label className="text-xs">Характер распределения материалов</Label>
        <Select
          value={watch('materialDistribution')}
          onValueChange={(v) => setValue('materialDistribution', v as EditTaskFormData['materialDistribution'])}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MATERIAL_DIST_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Тип расчёта */}
      <div className="space-y-1">
        <Label className="text-xs">Тип расчёта</Label>
        <Select
          value={watch('calcType') ?? '__none__'}
          onValueChange={(v) =>
            setValue('calcType', v === '__none__' ? null : (v as EditTaskFormData['calcType']))
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="По умолчанию" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">По умолчанию</SelectItem>
            {Object.entries(CALC_TYPE_LABELS).filter(([k]) => k !== 'DEFAULT').map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Комментарий */}
      <div className="space-y-1">
        <Label className="text-xs">Комментарий</Label>
        <Textarea
          {...register('comment')}
          className="text-sm min-h-[80px] resize-none"
          placeholder="Комментарий к задаче (отображается под названием в таблице)"
        />
      </div>

      {/* Прикреплённые файлы */}
      <div className="space-y-2">
        <Label className="text-xs">Прикреплённые файлы</Label>

        {task.attachmentS3Keys.length > 0 && (
          <ul className="space-y-1">
            {task.attachmentS3Keys.map((key) => (
              <li key={key} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">{fileNameFromKey(key)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 text-destructive hover:text-destructive"
                  disabled={removeAttachment.isPending}
                  onClick={() => removeAttachment.mutate(key)}
                  aria-label="Удалить файл"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={uploadAttachment.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            {uploadAttachment.isPending ? 'Загрузка...' : 'Прикрепить файл'}
          </Button>
        </div>
      </div>
    </div>
  );
}
