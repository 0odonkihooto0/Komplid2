'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InboxItemWithRoute } from '@/app/api/notifications/inbox/route';

export interface ActivityLogItem {
  id: string;
  action: string;
  entityType: string;
  entityName: string | null;
  isRead: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string };
  source: 'notification' | 'activity';
}

export type ActiveTab = 'inbox' | 'activity';

const INBOX_CATEGORIES = ['ИД', 'СЭД', 'ПИР', 'Переписка', 'Журналы', 'СК'] as const;
export type InboxCategory = (typeof INBOX_CATEGORIES)[number];

export function useNotificationsPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // Клиентский набор прочитанных inbox-элементов (ApprovalStep не имеет поля isRead)
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  const inboxQuery = useQuery<InboxItemWithRoute[]>({
    queryKey: ['notifications-inbox'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/inbox');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: 60_000,
  });

  const activityQuery = useQuery<{ items: ActivityLogItem[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (activeTab === 'inbox') {
        // Помечаем все inbox-элементы прочитанными локально
        const allIds = new Set(inboxQuery.data?.map((i) => i.stepId) ?? []);
        setReadSet(allIds);
      } else {
        await fetch('/api/notifications/read-all', { method: 'PATCH' });
      }
    },
    onSuccess: () => {
      if (activeTab === 'activity') {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
  });

  const markActivityRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  function selectItem(id: string) {
    setSelectedItemId(id);
    setReadSet((prev) => new Set([...Array.from(prev), id]));
  }

  function switchTab(tab: ActiveTab) {
    setActiveTab(tab);
    setActiveFilter('all');
    setSelectedItemId(null);
  }

  const inboxItems = inboxQuery.data ?? [];

  const filteredInboxItems = useMemo(() => {
    if (activeFilter === 'all') return inboxItems;
    return inboxItems.filter((i) => i.category === activeFilter);
  }, [inboxItems, activeFilter]);

  const selectedItem = useMemo(
    () => inboxItems.find((i) => i.stepId === selectedItemId) ?? null,
    [inboxItems, selectedItemId]
  );

  const inboxUnreadCount = inboxItems.filter((i) => !readSet.has(i.stepId)).length;
  const activityUnreadCount = activityQuery.data?.unreadCount ?? 0;

  return {
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
    activityItems: activityQuery.data?.items ?? [],
    inboxLoading: inboxQuery.isLoading,
    activityLoading: activityQuery.isLoading,
    markAllRead,
    markActivityRead,
    INBOX_CATEGORIES,
  };
}
