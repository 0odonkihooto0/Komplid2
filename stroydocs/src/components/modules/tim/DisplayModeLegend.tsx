'use client';

import type { DisplayMode } from './displayModes';
import { IFC_TYPE_COLORS, IFC_TYPE_LABELS } from './displayModes';

interface Props {
  mode: DisplayMode;
}

/**
 * Легенда цветов по типу IFC — overlay в правом нижнем углу canvas.
 * Показывается только в режиме byType. ЦУС стр. 302.
 */
export function DisplayModeLegend({ mode }: Props) {
  if (mode !== 'byType') return null;

  const items = Object.keys(IFC_TYPE_COLORS);

  return (
    <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-md border border-border bg-background/90 p-2 text-xs shadow-md backdrop-blur-sm">
      <div className="mb-1 font-medium text-muted-foreground">По типу элемента</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {items.map((type) => {
          const hex = `#${IFC_TYPE_COLORS[type].toString(16).padStart(6, '0')}`;
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm border border-black/10"
                style={{ background: hex }}
              />
              <span>{IFC_TYPE_LABELS[type] ?? type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
