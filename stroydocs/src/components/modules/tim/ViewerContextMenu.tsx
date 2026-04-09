'use client';

import { useEffect, useRef } from 'react';

interface ViewerContextMenuProps {
  x: number;
  y: number;
  onSavePng: () => void;
  onSaveJpg: () => void;
  onClose: () => void;
}

export function ViewerContextMenu({ x, y, onSavePng, onSaveJpg, onClose }: ViewerContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрыть по клику снаружи или Escape
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-40 rounded-md border border-border bg-background py-1 shadow-lg"
      style={{ top: y, left: x }}
    >
      <button
        onClick={onSavePng}
        className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
      >
        Сохранить как PNG
      </button>
      <button
        onClick={onSaveJpg}
        className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
      >
        Сохранить как JPG
      </button>
    </div>
  );
}
