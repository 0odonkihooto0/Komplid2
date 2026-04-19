'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { CommandPalette } from './CommandPalette';

/*
 * Кнопка-триггер в шапке + глобальный обработчик Cmd+K / Ctrl+K.
 * Важное правило (пользовательская директива):
 *   НЕ вызывать preventDefault, если фокус в input / textarea / contenteditable.
 *   В редакторе у Cmd+K может быть своя функция (например, вставка ссылки) — не ломаем.
 */

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK = e.key === 'k' && (e.metaKey || e.ctrlKey);
      if (!isCmdK) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      setOpen((prev) => !prev);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-[280px] items-center gap-2 rounded-panel border bg-[var(--bg-inset)] px-2.5 text-sm text-[var(--ink-muted)] transition-colors hover:border-[var(--border-strong)]"
        aria-label="Открыть поиск"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Найти документ, задачу, объект…</span>
        <kbd className="hidden rounded-[4px] border bg-background px-1.5 py-0.5 font-mono text-xs2 sm:inline">
          ⌘K
        </kbd>
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
