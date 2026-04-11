'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { StampTitle, PdfStamp } from './types';

interface UseAddStampParams {
  objectId: string;
  docId: string;
  s3Key: string;
  orgId: string;
  onSuccess: () => void;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Хук управления формой добавления штампа на документ ПИР.
 * Предоставляет сос��ояние формы, список титулов и мутации для:
 * - создания нового титула штампа (с автовыбором после создания)
 * - создания штампа с выбранным или произвольным текстом
 */
export function useAddStamp({
  objectId,
  docId,
  s3Key,
  orgId,
  onSuccess,
}: UseAddStampParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Состояние формы
  const [titleId, setTitleId] = useState<string | null>(null);
  const [newTitleName, setNewTitleName] = useState('');
  const [showNewTitle, setShowNewTitle] = useState(false);
  const [stampText, setStampText] = useState('');
  // page — 1-based для отображения пользователю
  const [page, setPage] = useState(1);

  // Список титулов штампов организации
  const titlesQuery = useQuery<StampTitle[]>({
    queryKey: ['stamp-titles', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/stamp-titles`);
      const json: ApiResponse<StampTitle[]> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки титулов штампов');
      return json.data;
    },
    enabled: !!orgId,
  });

  const stampTitles = titlesQuery.data ?? [];
  const titlesLoading = titlesQuery.isLoading;

  // Мутация создания нового титула штампа
  const createTitleMutation = useMutation({
    mutationFn: async (name: string): Promise<StampTitle> => {
      const res = await fetch(`/api/organizations/${orgId}/stamp-titles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json: ApiResponse<StampTitle> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания титула');
      return json.data;
    },
    onSuccess: (created) => {
      // Автоматически выбираем созданный титул и сбрасываем поле ввода
      setTitleId(created.id);
      setNewTitleName('');
      setShowNewTitle(false);
      queryClient.invalidateQueries({ queryKey: ['stamp-titles', orgId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка создания титула', description: err.message, variant: 'destructive' });
    },
  });

  // Мутация создания штампа
  const createStampMutation = useMutation({
    mutationFn: async ({
      resolvedText,
      resolvedTitleId,
    }: {
      resolvedText: string;
      resolvedTitleId: string | null;
    }): Promise<PdfStamp> => {
      const res = await fetch(`/api/projects/${objectId}/stamps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'DESIGN_DOC',
          entityId: docId,
          stampText: resolvedText,
          s3Key,
          positionX: 0.05,
          positionY: 0.05,
          // page пользователя 1-based → API ожидает 0-based
          page: page - 1,
          titleId: resolvedTitleId ?? undefined,
        }),
      });
      const json: ApiResponse<PdfStamp> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания штампа');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stamps', objectId, docId] });
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка создания штампа', description: err.message, variant: 'destructive' });
    },
  });

  /**
   * Отправляет форму: разрешает текст штампа из выбранного титула или свободного поля,
   * затем вызывает мутацию создания штампа.
   */
  function submitStamp() {
    const resolvedText =
      titleId !== null
        ? (stampTitles.find((t) => t.id === titleId)?.name ?? stampText)
        : stampText;
    createStampMutation.mutate({ resolvedText, resolvedTitleId: titleId });
  }

  // Форма валидна если: выбран титул ИЛИ введён произвольный текст, и страница >= 1
  const canSubmit = (!!titleId || stampText.trim().length > 0) && page >= 1;

  return {
    stampTitles,
    titlesLoading,
    titleId,
    setTitleId,
    newTitleName,
    setNewTitleName,
    showNewTitle,
    setShowNewTitle,
    stampText,
    setStampText,
    page,
    setPage,
    createTitleMutation,
    isSubmitting: createStampMutation.isPending,
    submitStamp,
    canSubmit,
  };
}
