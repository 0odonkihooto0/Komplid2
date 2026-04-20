'use client';

import { cn } from '@/lib/utils';
import type { InboxItemWithRoute } from '@/app/api/notifications/inbox/route';
import { CATEGORY_COLORS } from './InboxFeed';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return `Сегодня, ${date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`;
  if (days === 1) return `Вчера, ${date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`;
  return date.toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const ICON_BY_CATEGORY: Record<string, string> = {
  'ИД': 'M4 4h16v16H4z M8 8h8M8 12h8M8 16h5',
  'СЭД': 'M4 4h16v16H4z M4 8h16',
  'ПИР': 'M3 12l9-9 9 9 M3 12l9 9 9-9',
  'Переписка': 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  'Журналы': 'M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z',
  'СК': 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z',
};

const ICON_COLORS: Record<string, string> = {
  'ИД': 'text-blue-600',
  'СЭД': 'text-emerald-600',
  'ПИР': 'text-violet-600',
  'Переписка': 'text-amber-600',
  'Журналы': 'text-gray-500',
  'СК': 'text-red-600',
};

interface Props {
  item: InboxItemWithRoute;
  isSelected: boolean;
  isUnread: boolean;
  onClick: () => void;
}

export function InboxFeedItem({ item, isSelected, isUnread, onClick }: Props) {
  const iconPath = ICON_BY_CATEGORY[item.category] ?? ICON_BY_CATEGORY['ИД'];
  const iconColor = ICON_COLORS[item.category] ?? 'text-muted-foreground';
  const chipClass = CATEGORY_COLORS[item.category] ?? 'bg-muted text-muted-foreground border-border';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'relative grid cursor-pointer border-b px-4 py-3 transition-colors',
        'grid-cols-[36px_1fr_auto] gap-x-3',
        isSelected ? 'bg-accent/60' : isUnread ? 'bg-primary/[0.03] hover:bg-muted/50' : 'hover:bg-muted/40',
        isUnread && 'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'row-span-2 flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/50',
        iconColor
      )}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d={iconPath} />
        </svg>
      </div>

      {/* Head: chips + time */}
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide', chipClass)}>
          {item.category}
        </span>
        <span className="truncate text-xs font-medium text-foreground">{item.typeLabel}</span>
        {item.urgent && (
          <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-red-700">
            срочно
          </span>
        )}
      </div>

      {/* Time + unread dot */}
      <div className="row-span-2 flex flex-col items-end gap-1.5">
        <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">
          {formatTime(item.createdAt)}
        </span>
        {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
      </div>

      {/* Document name + meta */}
      <div className="min-w-0">
        <p className="truncate text-xs text-foreground">{item.documentName}</p>
        <p className="truncate text-[11px] text-muted-foreground">{item.objectName}</p>
      </div>
    </div>
  );
}
