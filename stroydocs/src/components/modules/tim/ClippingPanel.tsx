'use client';

import { Button } from '@/components/ui/button';
import type { ClipAxis } from './useClippingPlanes';

interface ClippingPanelProps {
  axis: ClipAxis;
  value: number;
  onAxisChange: (a: ClipAxis) => void;
  onValueChange: (v: number) => void;
  onClear: () => void;
}

/** Панель управления плоскостью разреза модели. */
export function ClippingPanel({
  axis,
  value,
  onAxisChange,
  onValueChange,
  onClear,
}: ClippingPanelProps) {
  const min = axis === 'horizontal' ? -50 : -100;
  const max = axis === 'horizontal' ? 100 : 100;

  return (
    <div className="absolute top-3 left-14 z-10 flex flex-col gap-2 rounded-md border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-medium text-foreground">Разрез</p>

      {/* Переключатель оси */}
      <div className="flex gap-1">
        <Button
          variant={axis === 'horizontal' ? 'default' : 'secondary'}
          size="sm"
          className="h-6 flex-1 px-2 text-xs"
          onClick={() => onAxisChange('horizontal')}
        >
          Горизонтальный
        </Button>
        <Button
          variant={axis === 'vertical' ? 'default' : 'secondary'}
          size="sm"
          className="h-6 flex-1 px-2 text-xs"
          onClick={() => onAxisChange('vertical')}
        >
          Вертикальный
        </Button>
      </div>

      {/* Слайдер положения плоскости */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min} м</span>
          <span className="font-medium text-foreground">{value.toFixed(1)} м</span>
          <span>{max} м</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={0.5}
          value={value}
          onChange={e => onValueChange(parseFloat(e.target.value))}
          className="w-48 accent-primary"
        />
      </div>

      {/* Убрать разрез */}
      <Button
        variant="outline"
        size="sm"
        className="h-6 w-full text-xs"
        onClick={onClear}
      >
        Убрать разрез
      </Button>
    </div>
  );
}
