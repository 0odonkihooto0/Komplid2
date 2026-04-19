'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Building2, FileText, FolderOpen, ListChecks, Loader2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@/types/api';
import type { SearchResults } from '@/app/api/search/route';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 200;

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function fetchSearch(q: string): Promise<SearchResults> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
    method: 'GET',
  });
  const json: ApiResponse<SearchResults> = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce 200ms — без библиотеки, одноразовый setTimeout на каждое изменение
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const canQuery = debounced.length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => fetchSearch(debounced),
    enabled: canQuery,
    staleTime: 30 * 1000,
  });

  // Сброс при закрытии + фокус при открытии
  useEffect(() => {
    if (open) {
      // next tick чтобы DialogContent успел смонтироваться
      const id = window.setTimeout(() => inputRef.current?.focus(), 10);
      return () => window.clearTimeout(id);
    } else {
      setQuery('');
      setDebounced('');
    }
  }, [open]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const hasResults =
    data &&
    (data.objects.length > 0 ||
      data.contracts.length > 0 ||
      data.docs.length > 0 ||
      data.tasks.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[20%] max-w-[640px] translate-y-0 gap-0 overflow-hidden p-0 sm:rounded-panel"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Глобальный поиск</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <Search className="h-4 w-4 text-[var(--ink-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти документ, задачу, объект…"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-[var(--ink-muted)]"
            autoComplete="off"
            spellCheck={false}
          />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-[var(--ink-muted)]" />}
          <kbd className="hidden rounded-[4px] border bg-[var(--bg-inset)] px-1.5 py-0.5 font-mono text-xs2 text-[var(--ink-muted)] sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-1">
          {!canQuery && (
            <EmptyHint>Начните вводить название объекта, документа или задачи</EmptyHint>
          )}
          {canQuery && !data && isFetching && <EmptyHint>Поиск…</EmptyHint>}
          {canQuery && data && !hasResults && <EmptyHint>Ничего не найдено</EmptyHint>}

          {data?.objects.length ? (
            <ResultGroup label="Объекты">
              {data.objects.map((o) => (
                <ResultRow
                  key={o.id}
                  icon={<Building2 className="h-4 w-4" />}
                  title={o.name}
                  subtitle={o.address ?? o.shortName ?? undefined}
                  onSelect={() => go(`/objects/${o.id}/info/general`)}
                />
              ))}
            </ResultGroup>
          ) : null}

          {data?.contracts.length ? (
            <ResultGroup label="Договоры">
              {data.contracts.map((c) => (
                <ResultRow
                  key={c.id}
                  icon={<FolderOpen className="h-4 w-4" />}
                  title={`№ ${c.number}`}
                  subtitle={c.name}
                  onSelect={() => go(`/objects/${c.projectId}/contracts`)}
                />
              ))}
            </ResultGroup>
          ) : null}

          {data?.docs.length ? (
            <ResultGroup label="Документы">
              {data.docs.map((d) => (
                <ResultRow
                  key={d.id}
                  icon={<FileText className="h-4 w-4" />}
                  title={`№ ${d.number}`}
                  subtitle={d.title}
                  onSelect={() => go(`/documents/${d.id}`)}
                />
              ))}
            </ResultGroup>
          ) : null}

          {data?.tasks.length ? (
            <ResultGroup label="Задачи">
              {data.tasks.map((t) => (
                <ResultRow
                  key={t.id}
                  icon={<ListChecks className="h-4 w-4" />}
                  title={t.title}
                  onSelect={() => go(`/objects/${t.projectId}/tasks/${t.id}`)}
                />
              ))}
            </ResultGroup>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-6 text-center text-sm text-[var(--ink-muted)]">{children}</div>;
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-1 py-1.5">
      <div className="px-3 pb-1 pt-2 font-mono text-xs2 uppercase text-[var(--ink-muted)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({
  icon,
  title,
  subtitle,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onSelect: () => void;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter') onSelect();
  };
  return (
    <button
      type="button"
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
        'hover:bg-[var(--bg-inset)] focus:bg-[var(--bg-inset)] focus:outline-none'
      )}
    >
      <span className="text-[var(--ink-muted)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-[var(--ink-muted)]">{subtitle}</div>
        )}
      </div>
    </button>
  );
}
