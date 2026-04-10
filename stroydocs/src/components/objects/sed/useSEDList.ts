'use client';

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

export interface SEDFilters {
  docType: SEDDocType | null;
  status: SEDStatus | null;
  senderOrg: string;
  receiverOrg: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: SEDFilters = {
  docType: null,
  status: null,
  senderOrg: '',
  receiverOrg: '',
  dateFrom: '',
  dateTo: '',
};

export interface SEDListItem {
  id: string;
  number: string;
  docType: SEDDocType;
  title: string;
  status: SEDStatus;
  isRead: boolean;
  date: string | null;
  createdAt: string;
  tags: string[];
  senderOrg: { id: string; name: string };
  receiverOrg?: { id: string; name: string } | null;
  author: { id: string; firstName: string; lastName: string };
  _count: { attachments: number };
}

interface UseSEDListParams {
  view: SEDView;
  folderId?: string | null;
  search?: string;
  filters?: SEDFilters;
  page?: number;
}

export function useSEDList(objectId: string, params: UseSEDListParams) {
  const { view, folderId, search = '', filters, page = 1 } = params;

  const buildUrl = () => {
    const p = new URLSearchParams();
    p.set('view', view);
    if (folderId) p.set('folderId', folderId);
    if (search.trim()) p.set('search', search.trim());
    if (filters?.docType) p.set('docType', filters.docType);
    if (filters?.status) p.set('status', filters.status);
    if (filters?.senderOrg.trim()) p.set('senderOrg', filters.senderOrg.trim());
    if (filters?.receiverOrg.trim()) p.set('receiverOrg', filters.receiverOrg.trim());
    if (filters?.dateFrom) p.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) p.set('dateTo', filters.dateTo);
    p.set('page', String(page));
    p.set('limit', '50');
    return `/api/objects/${objectId}/sed?${p.toString()}`;
  };

  const { data, isLoading, error, refetch } = useQuery<{
    data: SEDListItem[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ['sed', objectId, view, folderId, search, filters, page],
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
  };
}
