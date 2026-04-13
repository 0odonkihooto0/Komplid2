'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExpandToLevel: (level: number) => void;
}

const LEVELS = [1, 2, 3, 4, 5];

export function GanttContextMenu({
  x,
  y,
  onClose,
  onExpandAll,
  onCollapseAll,
  onExpandToLevel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [subOpen, setSubOpen] = useState(false);

  // Закрытие по клику вне меню или по Escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Смещаем меню чтобы оно не выходило за экран
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 160);

  function item(label: string, onClick: () => void) {
    return (
      <button
        type="button"
        className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted rounded transition-colors"
        onClick={() => { onClick(); onClose(); }}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      ref={ref}
      style={{ top: adjustedY, left: adjustedX }}
      className="fixed z-[9999] min-w-[180px] rounded-md border bg-background shadow-lg p-1 space-y-0.5"
    >
      {item('Раскрыть все разделы', onExpandAll)}
      {item('Свернуть все разделы', onCollapseAll)}

      <div className="h-px bg-border my-1" />

      {/* Подменю «До уровня» */}
      <div
        className="relative"
        onMouseEnter={() => setSubOpen(true)}
        onMouseLeave={() => setSubOpen(false)}
      >
        <button
          type="button"
          className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted rounded flex items-center justify-between transition-colors"
        >
          <span>Отобразить до уровня</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {subOpen && (
          <div className="absolute left-full top-0 min-w-[80px] rounded-md border bg-background shadow-lg p-1 space-y-0.5">
            {LEVELS.map((n) => (
              <button
                key={n}
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted rounded transition-colors"
                onClick={() => { onExpandToLevel(n); onClose(); }}
              >
                Уровень {n}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
