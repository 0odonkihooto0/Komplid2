'use client';

import { useState } from 'react';
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
import type { GanttStageItem } from './useGanttStructure';

interface Props {
  stages: GanttStageItem[];
  selectedStageId: string | null;
  onSelect: (stageId: string | null) => void;
  onAddStage: (name: string) => void;
  isCreating: boolean;
}

export function GanttStageFilter({
  stages,
  selectedStageId,
  onSelect,
  onAddStage,
  isCreating,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAddStage(name.trim());
    setName('');
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Кнопка «Все стадии» */}
      <Button
        size="sm"
        variant={selectedStageId === null ? 'default' : 'outline'}
        onClick={() => onSelect(null)}
      >
        Все стадии
      </Button>

      {/* Кнопка для каждой стадии */}
      {stages.map((stage) => (
        <Button
          key={stage.id}
          size="sm"
          variant={selectedStageId === stage.id ? 'default' : 'outline'}
          onClick={() => onSelect(stage.id)}
        >
          {stage.isCurrent && <span className="mr-1 text-green-500">●</span>}
          {stage.name}
          <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {stage._count.versions}
          </span>
        </Button>
      ))}

      {/* Кнопка добавления стадии */}
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        + Добавить стадию
      </Button>

      {/* Диалог создания стадии */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новая стадия реализации</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="stage-name">Название стадии</Label>
                <Input
                  id="stage-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: СМР, ПИР, Монтаж"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={!name.trim() || isCreating}>
                Создать
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
