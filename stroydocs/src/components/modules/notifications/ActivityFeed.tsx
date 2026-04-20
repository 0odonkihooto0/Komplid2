'use client';

import { Bell } from 'lucide-react';
import type { ActivityLogItem } from './useNotificationsPage';
import { ActivityFeedItem } from './ActivityFeedItem';

interface ActivityFeedProps {
  items: ActivityLogItem[];
  isLoading: boolean;
  onMarkRead: (id: string) => void;
}

export function ActivityFeed({ items, isLoading, onMarkRead }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-2.5 border-b px-4 py-3">
            <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border bg-muted">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mb-1 text-sm font-semibold">Нет уведомлений</p>
        <p className="text-xs text-muted-foreground">
          Здесь будет отображаться лента активности организации.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <ActivityFeedItem key={item.id} item={item} onClick={() => onMarkRead(item.id)} />
      ))}
    </div>
  );
}
