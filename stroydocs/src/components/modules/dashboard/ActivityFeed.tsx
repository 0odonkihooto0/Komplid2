'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

interface ActivityLogItem {
  id: string;
  action: string;
  entityType: string;
  entityName: string | null;
  isRead: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн. назад`;
  return `${Math.floor(days / 30)} мес. назад`;
}

function formatAction(item: ActivityLogItem): string {
  const name = item.entityName ?? item.entityType;
  switch (item.action) {
    case 'created_doc': return `создал документ «${name}»`;
    case 'signed_doc': return `подписал документ «${name}»`;
    case 'rejected_doc': return `отклонил документ «${name}»`;
    case 'created_contract': return `создал договор «${name}»`;
    case 'created_work_record': return `создал запись о работе «${name}»`;
    case 'approval_required': return `ожидает согласования «${name}»`;
    case 'doc_approved': return `согласовал документ «${name}»`;
    default: return `выполнил действие в «${name}»`;
  }
}

// Лента последних событий организации
export function ActivityFeed() {
  const queryClient = useQueryClient();

  const { data } = useQuery<{ items: ActivityLogItem[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      return json.success ? json.data : { items: [], unreadCount: 0 };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-primary" />
          Лента событий
          {unreadCount > 0 && (
            <span className="inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Прочитать все
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card divide-y">
        {items.map((item) => {
          const initials = `${item.user.lastName[0] ?? ''}${item.user.firstName[0] ?? ''}`.toUpperCase();
          return (
            <div
              key={item.id}
              className={cn(
                'flex gap-3 px-4 py-3 first:rounded-t-xl last:rounded-b-xl transition-colors',
                !item.isRead && 'bg-blue-50/40'
              )}
            >
              <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  <span className="font-medium">
                    {item.user.lastName} {item.user.firstName}
                  </span>{' '}
                  {formatAction(item)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(item.createdAt)}</p>
              </div>
              {!item.isRead && (
                <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
