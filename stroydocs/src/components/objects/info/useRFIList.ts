'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export type RFIStatus = 'OPEN' | 'IN_REVIEW' | 'ANSWERED' | 'CLOSED' | 'CANCELLED';
export type RFIPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface RFIListItem {
  id: string;
  number: string;
  title: string;
  description: string;
  status: RFIStatus;
  priority: RFIPriority;
  deadline: string | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
  assignee: { id: string; firstName: string; lastName: string } | null;
  _count: { attachments: number };
}

// «Просроченные» — фронтовой фильтр: deadline < now && status не финальный
type FilterTab = 'all' | 'OPEN' | 'IN_REVIEW' | 'ANSWERED' | 'overdue';

export function useRFIList(objectId: string) {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [priority, setPriority] = useState<RFIPriority | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // API фильтр статуса (не передаём для overdue — фильтруем на клиенте)
  const apiStatus = filterTab !== 'all' && filterTab !== 'overdue' ? filterTab : undefined;

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (apiStatus) params.set('status', apiStatus);
    if (priority) params.set('priority', priority);
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(page));
    params.set('limit', '50');
    return `/api/objects/${objectId}/rfi?${params.toString()}`;
  };

  const { data, isLoading, error, refetch } = useQuery<{
    data: RFIListItem[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ['rfi', objectId, filterTab, priority, search, page],
    queryFn: async () => {
      const res = await fetch(buildUrl());
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json.data;
    },
  });

  const now = new Date();
  const FINAL_STATUSES: RFIStatus[] = ['ANSWERED', 'CLOSED', 'CANCELLED'];

  // Клиентский фильтр «Просроченные»
  const items =
    filterTab === 'overdue'
      ? (data?.data ?? []).filter(
          (rfi) =>
            rfi.deadline &&
            new Date(rfi.deadline) < now &&
            !FINAL_STATUSES.includes(rfi.status),
        )
      : (data?.data ?? []);

  return {
    items,
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
    filterTab,
    setFilterTab,
    priority,
    setPriority,
    search,
    setSearch,
    page,
    setPage,
  };
}
