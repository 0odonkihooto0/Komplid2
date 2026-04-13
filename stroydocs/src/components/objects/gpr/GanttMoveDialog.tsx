'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  allTasks: GanttTaskItem[];
  /** ID задач, которые нужно переместить (чтобы не показывать их как цели) */
  movingTaskIds: Set<string>;
  onConfirm: (targetParentId: string | null) => void;
}

export function GanttMoveDialog({
  open,
  onOpenChange,
  allTasks,
  movingTaskIds,
  onConfirm,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | 'root' | null>(null);

  // Только разделы верхнего уровня (level 0) которые не входят в перемещаемые
  const sections = allTasks.filter(
    (t) => t.level === 0 && !movingTaskIds.has(t.id),
  );

  function handleConfirm() {
    if (selectedId === null) return;
    onConfirm(selectedId === 'root' ? null : selectedId);
    onOpenChange(false);
    setSelectedId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Переместить в раздел</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-64 rounded border">
          <div className="p-1 space-y-0.5">
            {/* Корень версии */}
            <button
              type="button"
              onClick={() => setSelectedId('root')}
              className={`w-full text-left rounded px-2 py-1.5 text-xs transition-colors ${
                selectedId === 'root'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              (Корень версии — без родительского раздела)
            </button>

            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left rounded px-2 py-1.5 text-xs transition-colors ${
                  selectedId === s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {s.name}
              </button>
            ))}

            {sections.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">
                Нет доступных разделов для перемещения
              </p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button disabled={selectedId === null} onClick={handleConfirm}>
            Переместить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
