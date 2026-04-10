'use client';

interface LayerPanelProps {
  layers: Map<string, boolean>;
  onToggle: (name: string, visible: boolean) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export function LayerPanel({ layers, onToggle, onShowAll, onHideAll }: LayerPanelProps) {
  return (
    <div className="absolute top-3 left-14 z-10 w-64 rounded-md border border-border bg-background/95 shadow-md backdrop-blur-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium">Слои</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Показать все
          </button>
          <span className="text-xs text-muted-foreground">/</span>
          <button
            onClick={onHideAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Скрыть все
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto px-2 py-1">
        {layers.size === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">Слои не найдены</p>
        ) : (
          Array.from(layers.entries()).map(([name, visible]) => (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={visible}
                onChange={e => onToggle(name, e.target.checked)}
                className="h-3 w-3 accent-primary"
              />
              <span className="truncate text-xs" title={name}>{name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
