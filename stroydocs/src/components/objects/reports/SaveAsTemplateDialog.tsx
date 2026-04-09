'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { BlockDefinition, CreateTemplatePayload } from './useTemplates';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Блоки текущего отчёта */
  blocks: BlockDefinition[];
  /** Наименование отчёта для авто-заполнения поля */
  defaultName: string;
  onSubmit: (payload: CreateTemplatePayload) => void;
  isPending: boolean;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  blocks,
  defaultName,
  onSubmit,
  isPending,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Авто-заполнить имя при открытии
  useEffect(() => {
    if (open) {
      setName(defaultName ? `Шаблон: ${defaultName}` : '');
      setDescription('');
    }
  }, [open, defaultName]);

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      blockDefinitions: blocks,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Сохранить как шаблон</DialogTitle>
          <DialogDescription>
            Блоки текущего отчёта ({blocks.length} шт.) будут сохранены как новый шаблон организации
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Наименование */}
          <div className="space-y-1.5">
            <Label htmlFor="save-tmpl-name">
              Наименование шаблона <span className="text-destructive">*</span>
            </Label>
            <Input
              id="save-tmpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Описание */}
          <div className="space-y-1.5">
            <Label htmlFor="save-tmpl-desc">Описание</Label>
            <Textarea
              id="save-tmpl-desc"
              placeholder="Краткое описание назначения шаблона"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Превью блоков */}
          {blocks.length > 0 && (
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-xs text-muted-foreground font-medium mb-2">Блоки:</p>
              {blocks.map((b, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {i + 1}. {b.title}
                </p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim() || blocks.length === 0 || isPending}
          >
            {isPending ? 'Сохранение...' : 'Сохранить шаблон'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
