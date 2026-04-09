'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreateTemplatePayload, BlockDefinition } from './useTemplates';

// Русские метки для типов блоков
const BLOCK_TYPE_LABELS: Record<string, string> = {
  TITLE_PAGE:        'Титульный лист',
  WORK_VOLUMES:      'Объём выполненных работ',
  KS2_ACTS:          'Акты КС-2',
  ID_STATUS:         'Исполнительная документация',
  DEFECTS_SUMMARY:   'Сводка недостатков',
  GPR_PROGRESS:      'Ход выполнения ГПР',
  PHOTO_REPORT:      'Фото-отчёт',
  FUNDING_STATUS:    'Финансирование',
  DAILY_LOG_SUMMARY: 'Дневник прораба',
  FREE_TEXT:         'Произвольный текст',
  CUSTOM_TABLE:      'Произвольная таблица',
};

const BLOCK_TYPES = Object.keys(BLOCK_TYPE_LABELS);

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateTemplatePayload) => void;
  isPending: boolean;
}

type DraftBlock = { type: string; title: string };

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState<DraftBlock[]>([
    { type: 'TITLE_PAGE', title: 'Титульный лист' },
  ]);
  // Тип нового блока для добавления
  const [newBlockType, setNewBlockType] = useState('FREE_TEXT');

  function resetForm() {
    setName('');
    setDescription('');
    setBlocks([{ type: 'TITLE_PAGE', title: 'Титульный лист' }]);
    setNewBlockType('FREE_TEXT');
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm();
    onOpenChange(val);
  }

  function addBlock() {
    setBlocks((prev) => [
      ...prev,
      { type: newBlockType, title: BLOCK_TYPE_LABELS[newBlockType] ?? newBlockType },
    ]);
  }

  function removeBlock(idx: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveBlock(idx: number, direction: 'up' | 'down') {
    const next = [...blocks];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    setBlocks(next);
  }

  function updateBlockTitle(idx: number, title: string) {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, title } : b)));
  }

  function handleSubmit() {
    if (!name.trim() || blocks.length === 0) return;

    const blockDefinitions: BlockDefinition[] = blocks.map((b, i) => ({
      order: i,
      type: b.type,
      title: b.title,
    }));

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      blockDefinitions,
    });
  }

  const canSubmit = name.trim().length > 0 && blocks.length > 0 && !isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новый шаблон отчёта</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Наименование */}
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-name">
              Наименование <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tmpl-name"
              placeholder="Например: Квартальный отчёт"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Описание */}
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-desc">Описание</Label>
            <Textarea
              id="tmpl-desc"
              placeholder="Краткое описание назначения шаблона"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Список блоков */}
          <div className="space-y-2">
            <Label>Блоки отчёта <span className="text-destructive">*</span></Label>
            {blocks.map((block, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-md border p-2">
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => moveBlock(idx, 'up')}
                    disabled={idx === 0}
                    aria-label="Переместить вверх"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => moveBlock(idx, 'down')}
                    disabled={idx === blocks.length - 1}
                    aria-label="Переместить вниз"
                  >
                    ↓
                  </Button>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-muted-foreground">{BLOCK_TYPE_LABELS[block.type] ?? block.type}</p>
                  <Input
                    value={block.title}
                    onChange={(e) => updateBlockTitle(idx, e.target.value)}
                    placeholder="Заголовок блока"
                    className="h-7 text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-destructive"
                  onClick={() => removeBlock(idx)}
                  aria-label="Удалить блок"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          {/* Добавить блок */}
          <div className="flex items-center gap-2">
            <Select value={newBlockType} onValueChange={setNewBlockType}>
              <SelectTrigger className="flex-1">
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
            <Button variant="outline" size="sm" onClick={addBlock}>
              + Блок
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? 'Создание...' : 'Создать шаблон'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
