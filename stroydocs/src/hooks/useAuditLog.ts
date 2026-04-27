'use client';

import { useQuery } from '@tanstack/react-query';

export interface AuditLogActor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actorUserId: string | null;
  actor: AuditLogActor | null;
}

export interface AuditLogFilters {
  from?: string;
  to?: string;
  action?: string;
  actorUserId?: string;
  resourceType?: string;
  page?: number;
  take?: number;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useAuditLog(workspaceId: string, filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.action) params.set('action', filters.action);
  if (filters.actorUserId) params.set('actorUserId', filters.actorUserId);
  if (filters.resourceType) params.set('resourceType', filters.resourceType);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.take) params.set('take', String(filters.take));

  return useQuery<AuditLogResponse>({
    queryKey: ['audit-log', workspaceId, filters],
    queryFn: async () => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/audit-log?${params.toString()}`
      );
      if (!res.ok) throw new Error('Ошибка загрузки журнала аудита');
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка сервера');
      return { data: json.data as AuditLogEntry[], meta: json.meta };
    },
    staleTime: 30_000,
  });
}
