'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { syncQueueRepo } from '@/lib/idb/repos/sync-queue-repo';
import { syncManager } from '@/lib/idb/sync-manager';
import { useNetworkStore } from '@/stores/network-store';
import type { SyncQueueItem } from '@/lib/idb/db';

export function SyncQueuePanel() {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = async () => {
    setItems(await syncQueueRepo.listAll());
  };

  useEffect(() => {
    refresh();

    const unsub = syncManager.subscribe((event) => {
      if (event.type === 'started') setIsSyncing(true);
      if (event.type === 'finished') {
        setIsSyncing(false);
        refresh();
      }
      if (event.type === 'item-success' || event.type === 'item-failed') {
        refresh();
      }
    });

    const interval = setInterval(refresh, 3000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'syncing');
  const failed = items.filter((i) => i.status === 'failed');
  const total = pending.length + failed.length;

  if (total === 0 && !isSyncing) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : isOnline ? (
            <Cloud className="w-4 h-4" />
          ) : (
            <CloudOff className="w-4 h-4" />
          )}
          {total > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs">
              {total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="font-medium text-sm">
            {total > 0 ? `Ожидают синхронизации: ${total}` : 'Синхронизация...'}
          </div>

          {pending.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">В очереди</div>
              {pending.slice(0, 5).map((item) => (
                <div key={item.id} className="text-sm truncate text-foreground">
                  {item.description ?? `${item.method} ${item.url}`}
                </div>
              ))}
              {pending.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  …и ещё {pending.length - 5}
                </div>
              )}
            </div>
          )}

          {failed.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-red-500">
                Не удалось отправить ({failed.length})
              </div>
              {failed.slice(0, 3).map((item) => (
                <div key={item.id} className="text-sm">
                  <div className="truncate">{item.description}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.lastError}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => syncManager.sync()}
              disabled={!isOnline || isSyncing}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Повторить
            </Button>
            {failed.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await syncQueueRepo.resetFailed();
                  refresh();
                }}
              >
                Сбросить ошибки
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
