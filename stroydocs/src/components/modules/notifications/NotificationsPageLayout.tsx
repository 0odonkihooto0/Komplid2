'use client';

import { Check, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InboxFeed } from './InboxFeed';
import { ActivityFeed } from './ActivityFeed';
import { NotificationsDetailPanel } from './NotificationsDetailPanel';
import { useNotificationsPage } from './useNotificationsPage';

export function NotificationsPageLayout() {
  const {
    activeTab,
    activeFilter,
    selectedItemId,
    readSet,
    switchTab,
    setActiveFilter,
    selectItem,
    filteredInboxItems,
    selectedItem,
    inboxUnreadCount,
    activityUnreadCount,
    activityItems,
    inboxLoading,
    activityLoading,
    markAllRead,
    markActivityRead,
    INBOX_CATEGORIES,
  } = useNotificationsPage();

  return (
    // -m-6 компенсирует p-6 родительского <main>; высота = 100vh минус Header (h-12 = 48px)
    <div className="-m-6 flex h-[calc(100vh-48px)] flex-col overflow-hidden">
      {/* Two-panel content */}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px]">
        {/* LEFT: feed */}
        <div className="flex min-h-0 flex-col border-r">
          {/* Tab bar */}
          <div className="flex flex-shrink-0 items-center border-b bg-background px-4">
            {/* Tab: Входящие */}
            <button
              onClick={() => switchTab('inbox')}
              className={cn(
                'relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors',
                activeTab === 'inbox'
                  ? 'text-foreground after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Входящие
              {inboxUnreadCount > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 font-mono text-[10px] border',
                  activeTab === 'inbox'
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'bg-muted text-muted-foreground border-border'
                )}>
                  {inboxUnreadCount}
                </span>
              )}
            </button>

            {/* Tab: Лента */}
            <button
              onClick={() => switchTab('activity')}
              className={cn(
                'relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors',
                activeTab === 'activity'
                  ? 'text-foreground after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Лента
              {activityUnreadCount > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 font-mono text-[10px] border',
                  activeTab === 'activity'
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'bg-muted text-muted-foreground border-border'
                )}>
                  {activityUnreadCount}
                </span>
              )}
            </button>

            <div className="ml-auto flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <Check className="h-3 w-3" />
                Все прочитаны
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Feed */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === 'inbox' ? (
              <InboxFeed
                items={filteredInboxItems}
                selectedId={selectedItemId}
                activeFilter={activeFilter}
                readSet={readSet}
                categories={INBOX_CATEGORIES}
                onFilterChange={setActiveFilter}
                onSelect={selectItem}
                isLoading={inboxLoading}
              />
            ) : (
              <ActivityFeed
                items={activityItems}
                isLoading={activityLoading}
                onMarkRead={(id) => markActivityRead.mutate(id)}
              />
            )}
          </div>
        </div>

        {/* RIGHT: detail panel */}
        <NotificationsDetailPanel item={selectedItem} />
      </div>
    </div>
  );
}
