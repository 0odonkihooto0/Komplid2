'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, Clock, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
    case 'approval_required': return `ожидает согласования «${name}»`;
    case 'doc_approved': return `согласовал документ «${name}»`;
    case 'created_contract': return `создал договор «${name}»`;
    case 'created_work_record': return `создал запись о работе «${name}»`;
    default: return `выполнил действие в «${name}»`;
  }
}

function ActionIcon({ action }: { action: string }) {
  if (action === 'approval_required') return <Clock className="h-3 w-3 text-amber-500" />;
  if (action === 'signed_doc' || action === 'doc_approved') return <Check className="h-3 w-3 text-emerald-500" />;
  if (action === 'rejected_doc') return <X className="h-3 w-3 text-red-500" />;
  return <FileText className="h-3 w-3 text-muted-foreground" />;
}

interface Props {
  isCollapsed: boolean;
}

/** Уведомления в боковой панели — Popover вместо ссылки */
export function NotificationDropdown({ isCollapsed }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data } = useQuery<{ items: ActivityLogItem[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      return json.success ? json.data : { items: [], unreadCount: 0 };
    },
    refetchInterval: 30000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = data?.unreadCount ?? 0;
  const items = (data?.items ?? []).slice(0, 10);

  const trigger = (
    <PopoverTrigger asChild>
      <button
        className={cn(
          'flex w-full items-center rounded-md text-sm font-medium transition-colors',
          isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
          open
            ? 'bg-blue-600/30 text-white'
            : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
        )}
      >
        <div className="relative flex-shrink-0">
          <Bell className="h-4 w-4" />
          {/* Маленькая точка в свёрнутом режиме */}
          {isCollapsed && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500" />
          )}
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">Уведомления</span>
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </PopoverTrigger>
  );

  const popover = (
    <Popover open={open} onOpenChange={setOpen}>
      {trigger}
      <PopoverContent side="right" align="start" sideOffset={8} className="w-80 p-0">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Уведомления</h3>
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
        <Separator />

        {/* Список уведомлений */}
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Нет уведомлений
            </p>
          ) : (
            items.map((item) => {
              const initials = `${item.user.lastName[0]}${item.user.firstName[0]}`.toUpperCase();
              const isApproval = item.action === 'approval_required';
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors',
                    !item.isRead && isApproval && 'bg-amber-50/60 hover:bg-amber-50',
                    !item.isRead && !isApproval && 'bg-blue-50/50 hover:bg-blue-50/80',
                    item.isRead && 'hover:bg-muted/40'
                  )}
                  onClick={() => {
                    if (!item.isRead) markOneRead.mutate(item.id);
                    setOpen(false);
                    router.push('/notifications');
                  }}
                >
                  <div className="relative flex-shrink-0 mt-0.5">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background border border-border">
                      <ActionIcon action={item.action} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">
                      <span className="font-medium">{item.user.lastName} {item.user.firstName}</span>{' '}
                      {formatAction(item)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(item.createdAt)}</p>
                  </div>
                  {!item.isRead && (
                    <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-primary self-start" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Ссылка «Все уведомления» */}
        <Separator />
        <div className="px-4 py-2">
          <Link
            href="/notifications"
            className="text-xs text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            Все уведомления →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{popover}</div>
          </TooltipTrigger>
          <TooltipContent side="right">
            Уведомления{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return popover;
}
