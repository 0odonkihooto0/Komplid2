'use client';

import { FlipHorizontal2, FlipVertical2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ClipAxis, ClipPlane } from './useClippingPlanes';
import { MAX_CLIP_PLANES } from './useClippingPlanes';

interface ClippingPanelProps {
  planes: ClipPlane[];
  onAdd: (axis: ClipAxis) => void;
  onUpdate: (id: string, patch: Partial<Omit<ClipPlane, 'id'>>) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const AXIS_LABEL: Record<ClipAxis, string> = {
  horizontal: 'Горизонтальный',
  vertical: 'Вертикальный',
};

/** Панель управления плоскостями разреза (до 3 одновременно, ЦУС стр. 302). */
export function ClippingPanel({
  planes,
  onAdd,
  onUpdate,
  onRemove,
  onClearAll,
  onClose,
}: ClippingPanelProps) {
  const limitReached = planes.length >= MAX_CLIP_PLANES;

  return (
    <div className="absolute top-3 left-14 z-10 flex w-72 flex-col gap-3 rounded-md border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">Разрезы</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть панель разрезов"
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-1">
        <Button
          variant="secondary"
          size="sm"
          className="h-7 flex-1 gap-1 px-2 text-xs"
          disabled={limitReached}
          onClick={() => onAdd('horizontal')}
        >
          <Plus className="h-3 w-3" />
          Горизонтальный
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-7 flex-1 gap-1 px-2 text-xs"
          disabled={limitReached}
          onClick={() => onAdd('vertical')}
        >
          <Plus className="h-3 w-3" />
          Вертикальный
        </Button>
      </div>

      {planes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Добавьте до {MAX_CLIP_PLANES} разрезов по осям X / Y.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {planes.map((plane, idx) => (
            <PlaneRow
              key={plane.id}
              plane={plane}
              index={idx + 1}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {planes.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-full text-xs"
          onClick={onClearAll}
        >
          Удалить все разрезы
        </Button>
      )}
    </div>
  );
}

interface PlaneRowProps {
  plane: ClipPlane;
  index: number;
  onUpdate: (id: string, patch: Partial<Omit<ClipPlane, 'id'>>) => void;
  onRemove: (id: string) => void;
}

function PlaneRow({ plane, index, onUpdate, onRemove }: PlaneRowProps) {
  const FlipIcon = plane.axis === 'horizontal' ? FlipVertical2 : FlipHorizontal2;
  return (
    <div className="flex flex-col gap-1 rounded border border-border/60 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          {AXIS_LABEL[plane.axis]} #{index}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onUpdate(plane.id, { inverted: !plane.inverted })}
            aria-label="Инвертировать"
            className={`rounded p-0.5 hover:bg-accent ${
              plane.inverted ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <FlipIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(plane.id)}
            aria-label="Удалить разрез"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-6">0%</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={plane.percent}
          onChange={e => onUpdate(plane.id, { percent: parseInt(e.target.value, 10) })}
          className="flex-1 accent-primary"
        />
        <span className="w-10 text-right font-medium text-foreground">
          {plane.percent}%
        </span>
      </div>
    </div>
  );
}
