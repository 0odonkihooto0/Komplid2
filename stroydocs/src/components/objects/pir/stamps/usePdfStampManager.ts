'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { PdfStamp } from './types';

interface UsePdfStampManagerParams {
  objectId: string;
  docId: string;
  s3Key: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Хук управления штампами для конкретного файла документа ПИР.
 * Загружает все штампы документа, фильтрует по s3Key на клиенте.
 * Query key: ['stamps', objectId, docId] — переиспользуется для всех файлов одного документа.
 */
export function usePdfStampManager({ objectId, docId, s3Key }: UsePdfStampManagerParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);

  // Загрузка всех штампов документа (кешируется для всех файлов)
  const { data: allStamps = [], isLoading } = useQuery<PdfStamp[]>({
    queryKey: ['stamps', objectId, docId],
    queryFn: async () => {
      const params = new URLSearchParams({
        entityType: 'DESIGN_DOC',
        entityId: docId,
      });
      const res = await fetch(`/api/projects/${objectId}/stamps?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки штампов');
      const json: ApiResponse<PdfStamp[]> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      return json.data;
    },
    enabled: !!objectId && !!docId,
  });

  // Фильтрация штампов по конкретному файлу
  const stamps = allStamps.filter((s) => s.s3Key === s3Key);

  // Удаление штампа
  const deleteMutation = useMutation({
    mutationFn: async (stampId: string) => {
      const res = await fetch(`/api/projects/${objectId}/stamps/${stampId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err: ApiResponse<null> = await res.json();
        throw new Error(err.error ?? 'Ошибка удаления штампа');
      }
    },
    onSuccess: () => {
      // Инвалидируем все штампы документа (частичный ключ)
      queryClient.invalidateQueries({ queryKey: ['stamps', objectId, docId] });
      toast({ title: 'Штамп удалён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка удаления штампа', description: err.message, variant: 'destructive' });
    },
  });

  return {
    stamps,
    isLoading,
    deleteMutation,
    openAddDialog,
    setOpenAddDialog,
    openPreview,
    setOpenPreview,
  };
}
