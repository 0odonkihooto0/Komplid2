'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReportBlockType } from '@prisma/client';
import type { ReportBlock, AddBlockPayload } from './useReportCard';

// ─── Метки типов блоков ───────────────────────────────────────────────────────

export const BLOCK_TYPE_LABELS: Record<ReportBlockType, string> = {
  TITLE_PAGE:       'Титульный лист',
  WORK_VOLUMES:     'Объём работ',
  KS2_ACTS:         'Акты КС-2',
  ID_STATUS:        'Статус ИД',
  DEFECTS_SUMMARY:  'Сводка недостатков',
  GPR_PROGRESS:     'Ход ГПР',
  PHOTO_REPORT:     'Фото-отчёт',
  FUNDING_STATUS:   'Финансирование',
  DAILY_LOG_SUMMARY:'Дневник прораба',
  FREE_TEXT:        'Произвольный текст',
  CUSTOM_TABLE:     'Произвольная таблица',
};

const BLOCK_TYPES = Object.keys(BLOCK_TYPE_LABELS) as ReportBlockType[];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingBlocks: ReportBlock[];
  onSubmit: (payload: AddBlockPayload) => void;
  isPending: boolean;
}

export function AddBlockDialog({ open, onOpenChange, existingBlocks, onSubmit, isPending }: Props) {
  const [type, setType] = useState<ReportBlockType>('FREE_TEXT');
  const [title, setTitle] = useState('');

  // Авто-заполнение заголовка при выборе типа
  useEffect(() => {
    setTitle(BLOCK_TYPE_LABELS[type] ?? '');
  }, [type]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const maxOrder = existingBlocks.length > 0
      ? Math.max(...existingBlocks.map((b) => b.order))
      : -1;
    onSubmit({ type, title: title.trim(), order: maxOrder + 1 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить блок</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Тип блока</Label>
            <Select value={type} onValueChange={(v) => setType(v as ReportBlockType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {BLOCK_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Наименование блока</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
            {isPending ? 'Добавление...' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
