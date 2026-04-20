'use client';

import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboxItemWithRoute } from '@/app/api/notifications/inbox/route';
import { InboxFeedItem } from './InboxFeedItem';

const CATEGORY_COLORS: Record<string, string> = {
  'ИД': 'bg-blue-50 text-blue-700 border-blue-200',
  'СЭД': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'ПИР': 'bg-violet-50 text-violet-700 border-violet-200',
  'Переписка': 'bg-amber-50 text-amber-700 border-amber-200',
  'Журналы': 'bg-gray-100 text-gray-600 border-gray-200',
  'СК': 'bg-red-50 text-red-700 border-red-200',
};

const CATEGORY_DOT_COLORS: Record<string, string> = {
  'ИД': 'bg-blue-500',
  'СЭД': 'bg-emerald-500',
  'ПИР': 'bg-violet-500',
  'Переписка': 'bg-amber-500',
  'Журналы': 'bg-gray-400',
  'СК': 'bg-red-500',
};

export { CATEGORY_COLORS, CATEGORY_DOT_COLORS };

interface InboxFeedProps {
  items: InboxItemWithRoute[];
  selectedId: string | null;
  activeFilter: string;
  readSet: Set<string>;
  categories: readonly string[];
  onFilterChange: (cat: string) => void;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function InboxFeed({
  items,
  selectedId,
  activeFilter,
  readSet,
  categories,
  onFilterChange,
  onSelect,
  isLoading,
}: InboxFeedProps) {
  return (
    <div className="flex flex-col">
      {/* Filter chips */}
      <div className="flex flex-shrink-0 items-center gap-1.5 overflow-x-auto border-b px-4 py-2 scrollbar-hide">
        <button
          onClick={() => onFilterChange('all')}
          className={cn(
            'inline-flex h-6 flex-shrink-0 items-center rounded-full border px-2.5 text-xs font-medium transition-colors',
            activeFilter === 'all'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground'
          )}
        >
          Все
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onFilterChange(cat)}
            className={cn(
              'inline-flex h-6 flex-shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors',
              activeFilter === cat
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', CATEGORY_DOT_COLORS[cat] ?? 'bg-muted-foreground')} />
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 border-b px-4 py-3">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border bg-muted">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mb-1 text-sm font-semibold">Нет документов</p>
          <p className="text-xs text-muted-foreground">
            {activeFilter === 'all'
              ? 'Документов, ожидающих вашего согласования, нет.'
              : `По фильтру «${activeFilter}» ничего не найдено.`}
          </p>
        </div>
      ) : (
        items.map((item) => (
          <InboxFeedItem
            key={item.stepId}
            item={item}
            isSelected={selectedId === item.stepId}
            isUnread={!readSet.has(item.stepId)}
            onClick={() => onSelect(item.stepId)}
          />
        ))
      )}
    </div>
  );
}
