'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { JournalStatus, SpecialJournalType } from '@prisma/client';
import type { ApiResponse } from '@/types/api';
import type { CreateJournalInput } from '@/lib/validations/journal-schemas';
import type { JournalListItem } from './journal-constants';

interface JournalListResponse {
  data: JournalListItem[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export function useJournalRegistry(objectId: string) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Фильтры
  const [typeFilter, setTypeFilter] = useState<SpecialJournalType | ''>('');
  const [statusFilter, setStatusFilter] = useState<JournalStatus | ''>('');

  const baseUrl = `/api/projects/${objectId}/journals`;

  // Построение query-параметров
  const queryParams = new URLSearchParams();
  queryParams.set('limit', '50');
  if (typeFilter) queryParams.set('type', typeFilter);
  if (statusFilter) queryParams.set('status', statusFilter);

  // Загрузка списка журналов
  const { data, isLoading } = useQuery<JournalListResponse>({
    queryKey: ['journals', objectId, typeFilter, statusFilter],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки журналов');
      const json: ApiResponse<JournalListItem[]> = await res.json();
      if (!json.success) throw new Error('Ошибка загрузки журналов');
      return { data: json.data, meta: json.meta! };
    },
    enabled: !!objectId,
  });

  // Создание журнала
  const createMutation = useMutation({
    mutationFn: async (payload: CreateJournalInput) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка создания журнала');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Журнал создан' });
      queryClient.invalidateQueries({ queryKey: ['journals', objectId] });
      queryClient.invalidateQueries({ queryKey: ['counts', 'object', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  function handleRowClick(row: JournalListItem) {
    router.push(`/objects/${objectId}/journals/${row.id}`);
  }

  function handleReset() {
    setTypeFilter('');
    setStatusFilter('');
  }

  return {
    journals: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    isLoading,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    hasFilters: !!(typeFilter || statusFilter),
    createMutation,
    handleRowClick,
    handleReset,
  };
}
