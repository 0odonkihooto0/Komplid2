'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export type SEDDocType = 'LETTER' | 'ORDER' | 'PROTOCOL' | 'ACT' | 'MEMO' | 'NOTIFICATION' | 'OTHER';
export type SEDStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'IN_APPROVAL'
  | 'REQUIRES_ACTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';
export type SEDView = 'all' | 'active' | 'requires' | 'my' | 'sent';

export interface SEDListItem {
  id: string;
  number: string;
  docType: SEDDocType;
  title: string;
  status: SEDStatus;
  createdAt: string;
  tags: string[];
  senderOrg: { id: string; name: string };
  author: { id: string; firstName: string; lastName: string };
  _count: { attachments: number };
}

export function useSEDList(objectId: string) {
  const [view, setView] = useState<SEDView>('all');
  const [status, setStatus] = useState<SEDStatus | null>(null);
  const [docType, setDocType] = useState<SEDDocType | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set('view', view);
    if (status) params.set('status', status);
    if (docType) params.set('docType', docType);
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(page));
    params.set('limit', '50');
    return `/api/objects/${objectId}/sed?${params.toString()}`;
  };

  const { data, isLoading, error, refetch } = useQuery<{
    data: SEDListItem[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ['sed', objectId, view, status, docType, search, page],
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
    view, setView,
    status, setStatus,
    docType, setDocType,
    search, setSearch,
    page, setPage,
  };
}
