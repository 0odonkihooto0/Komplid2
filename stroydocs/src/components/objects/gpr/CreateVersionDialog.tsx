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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: GanttStageItem[];
  selectedStageId: string | null;
  isCreating: boolean;
  onCreate: (name: string) => void;
}

export function CreateVersionDialog({
  open,
  onOpenChange,
  stages,
  selectedStageId,
  isCreating,
  onCreate,
}: Props) {
  const [name, setName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Новая версия ГПР</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="version-name">Название версии</Label>
              <Input
                id="version-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Актуальный ГПР v1"
                autoFocus
              />
            </div>
            {selectedStageId && (
              <p className="text-xs text-muted-foreground">
                Стадия: {stages.find((s) => s.id === selectedStageId)?.name ?? '—'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
