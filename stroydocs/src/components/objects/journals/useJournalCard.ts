'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { JournalEntryStatus, JournalLinkType } from '@prisma/client';
import type { ApiResponse, PaginationMeta } from '@/types/api';
import type { CreateJournalEntryInput } from '@/lib/validations/journal-schemas';
import type { JournalDetail, JournalEntryItem } from './journal-constants';

export function useJournalCard(objectId: string, journalId: string) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Фильтры записей
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | ''>('');
  // Выбранные записи для bulk-операций
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  // Создание связи между записями журналов
  const createLinkMutation = useMutation({
    mutationFn: async ({
      sourceEntryId,
      targetEntryId,
      linkType,
    }: {
      sourceEntryId: string;
      targetEntryId: string;
      linkType: JournalLinkType;
    }) => {
      const res = await fetch(`${baseUrl}/entries/${sourceEntryId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEntryId, linkType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка создания связи');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Связь добавлена' });
      queryClient.invalidateQueries({ queryKey: ['journal-entries', objectId, journalId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Создание АОСР из записи журнала
  const createExecDocMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(`${baseUrl}/entries/${entryId}/create-exec-doc`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка создания АОСР');
      }
      const json: ApiResponse<{ id: string; number: string; title: string; contractId: string }> =
        await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания АОСР');
      return json.data;
    },
    onSuccess: (data) => {
      toast({ title: `АОСР ${data.number} создан` });
      queryClient.invalidateQueries({ queryKey: ['journal-entries', objectId, journalId] });
      router.push(`/objects/${objectId}/id/${data.contractId}?docId=${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Вспомогательная функция инвалидации записей
  function invalidateEntries() {
    queryClient.invalidateQueries({ queryKey: ['journal-entries', objectId, journalId] });
    queryClient.invalidateQueries({ queryKey: ['journal', objectId, journalId] });
  }

  // Загрузка вложения к записи (не мутация — вызывается внутри handleCreateEntry)
  async function uploadEntryAttachment(entryId: string, file: File): Promise<void> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${baseUrl}/entries/${entryId}/attachments`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? 'Ошибка загрузки файла');
    }
  }

  // Удаление одной записи журнала
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(`${baseUrl}/entries/${entryId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка удаления записи');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Запись удалена' });
      invalidateEntries();
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Дублирование записи журнала
  const duplicateMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(`${baseUrl}/entries/${entryId}/duplicate`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка дублирования записи');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Запись продублирована' });
      invalidateEntries();
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Массовое удаление записей (только DRAFT, до 50)
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`${baseUrl}/entries/bulk-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка массового удаления');
      }
      return res.json();
    },
    onSuccess: (_data, ids) => {
      toast({ title: `Удалено записей: ${ids.length}` });
      setSelectedIds([]);
      invalidateEntries();
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Создание записи + последовательная загрузка файлов-вложений
  async function handleCreateEntry(
    payload: CreateJournalEntryInput,
    files: File[],
    sectionId?: string,
  ): Promise<void> {
    const mergedPayload = sectionId ? { ...payload, sectionId } : payload;
    const result: ApiResponse<{ id: string }> = await createEntryMutation.mutateAsync(mergedPayload);
    if (files.length > 0 && result.success && result.data?.id) {
      for (const file of files) {
        await uploadEntryAttachment(result.data.id, file);
      }
      invalidateEntries();
    }
  }

  // Запуск маршрута согласования
  const startApprovalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/workflow`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка запуска согласования');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Маршрут согласования запущен' });
      queryClient.invalidateQueries({ queryKey: ['journal', objectId, journalId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Счётчик замечаний к журналу
  const { data: remarksCountData } = useQuery<{ meta: { total: number } }>({
    queryKey: ['journal-remarks-count', objectId, journalId],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/remarks?limit=1`);
      if (!res.ok) return { meta: { total: 0 } };
      return res.json();
    },
    enabled: !!objectId && !!journalId,
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
    remarksTotal: remarksCountData?.meta?.total ?? 0,
    selectedIds,
    setSelectedIds,
    createEntryMutation,
    deleteEntryMutation,
    duplicateMutation,
    bulkDeleteMutation,
    storageMutation,
    createLinkMutation,
    createExecDocMutation,
    startApprovalMutation,
    handleCreateEntry,
    handleEntryClick,
    handleBack,
  };
}
