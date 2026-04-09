'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { JournalEntryStatus } from '@prisma/client';
import type { ApiResponse } from '@/types/api';
import type { CreateRemarkInput, UpdateRemarkInput } from '@/lib/validations/journal-schemas';
import type { EntryDetail } from './journal-constants';

export function useEntryDetail(objectId: string, journalId: string, entryId: string) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);

  const baseUrl = `/api/projects/${objectId}/journals/${journalId}/entries/${entryId}`;
  const queryKey = ['journal-entry', objectId, journalId, entryId];

  // Загрузка детальной карточки записи
  const {
    data: entry,
    isLoading,
  } = useQuery<EntryDetail>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки записи');
      const json: ApiResponse<EntryDetail> = await res.json();
      if (!json.success) throw new Error('Ошибка загрузки записи');
      return json.data;
    },
    enabled: !!objectId && !!journalId && !!entryId,
  });

  // Смена статуса записи
  const statusMutation = useMutation({
    mutationFn: async (newStatus: JournalEntryStatus) => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка смены статуса');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Статус записи изменён' });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['journal-entries', objectId, journalId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Создание замечания
  const createRemarkMutation = useMutation({
    mutationFn: async (payload: CreateRemarkInput) => {
      const res = await fetch(`${baseUrl}/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка создания замечания');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Замечание добавлено' });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Обновление замечания (статус, резолюция)
  const updateRemarkMutation = useMutation({
    mutationFn: async ({ remarkId, data }: { remarkId: string; data: UpdateRemarkInput }) => {
      const res = await fetch(`${baseUrl}/remarks/${remarkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка обновления замечания');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Замечание обновлено' });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Удаление замечания
  const deleteRemarkMutation = useMutation({
    mutationFn: async (remarkId: string) => {
      const res = await fetch(`${baseUrl}/remarks/${remarkId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка удаления замечания');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Замечание удалено' });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  function handleBack() {
    router.push(`/objects/${objectId}/journals/${journalId}`);
  }

  const isActive = entry?.journal.status === 'ACTIVE';
  const canEdit = isActive && (entry?.status === 'DRAFT' || entry?.status === 'REJECTED');

  return {
    entry,
    isLoading,
    isActive,
    canEdit,
    remarkDialogOpen,
    setRemarkDialogOpen,
    statusMutation,
    createRemarkMutation,
    updateRemarkMutation,
    deleteRemarkMutation,
    handleBack,
  };
}
