'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export type CorrespondenceDirection = 'OUTGOING' | 'INCOMING';
export type CorrespondenceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'READ'
  | 'IN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface CorrespondenceListItem {
  id: string;
  number: string;
  direction: CorrespondenceDirection;
  subject: string;
  status: CorrespondenceStatus;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  buildingObject: { id: string; name: string };
  senderOrg: { id: string; name: string };
  receiverOrg: { id: string; name: string };
  author: { id: string; firstName: string; lastName: string };
  _count: { attachments: number };
}

export function useCorrespondenceList(objectId: string) {
  const [direction, setDirection] = useState<CorrespondenceDirection | null>(null);
  const [status, setStatus] = useState<CorrespondenceStatus | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (direction) params.set('direction', direction);
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(page));
    params.set('limit', '50');
    return `/api/projects/${objectId}/correspondence?${params.toString()}`;
  };

  const { data, isLoading, error, refetch } = useQuery<{
    data: CorrespondenceListItem[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ['correspondence', objectId, direction, status, search, page],
    queryFn: async () => {
      const res = await fetch(buildUrl());
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json.data;
    },
  });

  return {
    items: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
    // Фильтры
    direction,
    setDirection,
    status,
    setStatus,
    search,
    setSearch,
    page,
    setPage,
  };
}
