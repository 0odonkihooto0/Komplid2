'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ALL_COLUMNS } from './execution-docs-columns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleColumns: string[];
  onSave: (ids: string[]) => void;
}

export function ColumnVisibilityDialog({ open, onOpenChange, visibleColumns, onSave }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(visibleColumns));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Колонки number и title нельзя скрыть
        if (id === 'number' || id === 'title') return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => setSelected(new Set(ALL_COLUMNS.map((c) => c.id)));
  const handleReset = () => setSelected(new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)));

  const handleSave = () => {
    onSave(Array.from(selected));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Колонки таблицы</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {ALL_COLUMNS.map((col) => {
            const isFixed = col.id === 'number' || col.id === 'title';
            return (
              <div key={col.id} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${col.id}`}
                  checked={selected.has(col.id)}
                  disabled={isFixed}
                  onCheckedChange={() => toggle(col.id)}
                />
                <Label htmlFor={`col-${col.id}`} className={isFixed ? 'text-muted-foreground text-xs' : 'text-sm'}>
                  {col.label}
                  {isFixed && ' (всегда)'}
                </Label>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}>
              Все
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              По умолчанию
            </Button>
          </div>
          <Button type="button" onClick={handleSave}>
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
