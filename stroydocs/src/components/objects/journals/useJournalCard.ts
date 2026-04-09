'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { JournalEntryStatus } from '@prisma/client';
import type { ApiResponse, PaginationMeta } from '@/types/api';
import type { CreateJournalEntryInput } from '@/lib/validations/journal-schemas';
import type { JournalDetail, JournalEntryItem } from './journal-constants';

export function useJournalCard(objectId: string, journalId: string) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Фильтры записей
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | ''>('');

  const baseUrl = `/api/projects/${objectId}/journals/${journalId}`;

  // Загрузка карточки журнала
  const {
    data: journal,
    isLoading: isJournalLoading,
  } = useQuery<JournalDetail>({
    queryKey: ['journal', objectId, journalId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки журнала');
      const json: ApiResponse<JournalDetail> = await res.json();
      if (!json.success) throw new Error('Ошибка загрузки журнала');
      return json.data;
    },
    enabled: !!objectId && !!journalId,
  });

  // Построение query-параметров для записей
  const entryParams = new URLSearchParams();
  entryParams.set('limit', '50');
  if (statusFilter) entryParams.set('status', statusFilter);

  // Загрузка записей журнала
  const {
    data: entriesData,
    isLoading: isEntriesLoading,
  } = useQuery<{ data: JournalEntryItem[]; meta: PaginationMeta }>({
    queryKey: ['journal-entries', objectId, journalId, statusFilter],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/entries?${entryParams.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки записей');
      const json: ApiResponse<JournalEntryItem[]> = await res.json();
      if (!json.success) throw new Error('Ошибка загрузки записей');
      return { data: json.data, meta: json.meta! };
    },
    enabled: !!objectId && !!journalId,
  });

  // Создание записи
  const createEntryMutation = useMutation({
    mutationFn: async (payload: CreateJournalEntryInput) => {
      const res = await fetch(`${baseUrl}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка создания записи');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Запись создана' });
      queryClient.invalidateQueries({ queryKey: ['journal-entries', objectId, journalId] });
      queryClient.invalidateQueries({ queryKey: ['journal', objectId, journalId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Переключение режима хранения
  const storageMutation = useMutation({
    mutationFn: async (action: 'ACTIVATE' | 'DEACTIVATE') => {
      const res = await fetch(`${baseUrl}/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка смены режима');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Режим журнала изменён' });
      queryClient.invalidateQueries({ queryKey: ['journal', objectId, journalId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Навигация к записи
  function handleEntryClick(entry: JournalEntryItem) {
    router.push(`/objects/${objectId}/journals/${journalId}/${entry.id}`);
  }

  // Назад к реестру
  function handleBack() {
    router.push(`/objects/${objectId}/journals/registry`);
  }

  function handleResetFilters() {
    setStatusFilter('');
  }

  const isActive = journal?.status === 'ACTIVE';

  return {
    journal,
    isJournalLoading,
    entries: entriesData?.data ?? [],
    entriesTotal: entriesData?.meta?.total ?? 0,
    isEntriesLoading,
    statusFilter,
    setStatusFilter,
    hasFilters: !!statusFilter,
    handleResetFilters,
    isActive,
    createEntryMutation,
    storageMutation,
    handleEntryClick,
    handleBack,
  };
}
