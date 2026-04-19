'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// ─── Типы ───────────────────────────────────────────────────────────────────

export interface ChangeLogEntry {
  id: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

interface HistoryResponse {
  success: boolean;
  data: ChangeLogEntry[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

// ─── Хук ────────────────────────────────────────────────────────────────────

interface UseEstimateHistoryParams {
  projectId: string;
  contractId: string;
  versionId: string;
  enabled?: boolean;
}

/** Хук для загрузки истории изменений версии сметы с пагинацией */
export function useEstimateHistory({
  projectId,
  contractId,
  versionId,
  enabled = true,
}: UseEstimateHistoryParams) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery<HistoryResponse>({
    queryKey: ['estimate-history', versionId, page],
    queryFn: async () => {
      const url = `/api/projects/${projectId}/contracts/${contractId}/estimate-versions/${versionId}/history?page=${page}&limit=${limit}`;
      const res = await fetch(url);
      return res.json() as Promise<HistoryResponse>;
    },
    enabled,
  });

  return {
    entries: data?.data ?? [],
    page,
    setPage,
    totalPages: data?.meta?.totalPages ?? 1,
    total: data?.meta?.total ?? 0,
    isLoading,
  };
}
