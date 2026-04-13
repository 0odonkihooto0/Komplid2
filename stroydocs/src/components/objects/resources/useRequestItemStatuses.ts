'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

// ─── Тип ─────────────────────────────────────────────────────────────────────

export interface RequestItemStatus {
  id: string;
  name: string;
  color: string | null;
}

// ─── Хук получения статусов ───────────────────────────────────────────────────

export function useRequestItemStatuses() {
  const { data: session } = useSession();
  const orgId = session?.user?.organizationId;

  const { data, isLoading } = useQuery<RequestItemStatus[]>({
    queryKey: ['request-item-statuses', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/request-item-statuses`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки статусов');
      return json.data as RequestItemStatus[];
    },
    enabled: !!orgId,
  });

  return { statuses: data ?? [], isLoading, orgId: orgId ?? '' };
}

// ─── Хук создания нового статуса ─────────────────────────────────────────────

export function useCreateItemStatus() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.user?.organizationId;

  return useMutation({
    mutationFn: async (body: { name: string; color?: string | null }) => {
      const res = await fetch(`/api/organizations/${orgId}/request-item-statuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания статуса');
      return json.data as RequestItemStatus;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request-item-statuses', orgId] });
    },
  });
}
