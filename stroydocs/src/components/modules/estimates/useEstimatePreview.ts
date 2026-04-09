'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { UpdateEstimateItemInput } from '@/lib/validations/estimate';
import { apiUrl, type EstimateImport } from './useEstimateImports';

/** Хук для загрузки и запуска парсинга сметы (XML/PDF — старый конвейер) */
export function useEstimateUpload(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Шаг 1: инициализация — получаем pre-signed URL
      const initRes = await fetch(apiUrl(projectId, contractId, '/upload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      });
      const initJson = await initRes.json();
      if (!initJson.success) throw new Error(initJson.error);

      const { import: importRecord, uploadUrl } = initJson.data;

      // Шаг 2: загрузка файла в S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!uploadRes.ok) throw new Error('Ошибка загрузки файла в хранилище');

      // Шаг 3: запуск парсинга (только для XML/PDF)
      const startRes = await fetch(
        apiUrl(projectId, contractId, `/${importRecord.id}/start`),
        { method: 'POST' }
      );
      const startJson = await startRes.json();
      if (!startJson.success) throw new Error(startJson.error);

      return startJson.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates', contractId] });
      toast({ title: 'Смета загружена и обработана' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка импорта', description: error.message, variant: 'destructive' });
    },
  });

  return { uploadMutation };
}

/** Хук для предпросмотра одного импорта */
export function useEstimatePreview(projectId: string, contractId: string, importId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: estimateImport, isLoading } = useQuery<EstimateImport>({
    queryKey: ['estimate-import', importId],
    queryFn: async () => {
      const res = await fetch(apiUrl(projectId, contractId, `/${importId}`));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateEstimateItemInput }) => {
      const res = await fetch(
        apiUrl(projectId, contractId, `/${importId}/items/${itemId}`),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-import', importId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({
      selectedItemIds,
      applyKsi,
    }: {
      selectedItemIds: string[];
      applyKsi: boolean;
    }) => {
      const res = await fetch(apiUrl(projectId, contractId, `/${importId}/confirm`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedItemIds, applyKsi }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['estimates', contractId] });
      queryClient.invalidateQueries({ queryKey: ['work-items', contractId] });
      queryClient.invalidateQueries({ queryKey: ['materials', contractId] });
      toast({ title: `Импорт подтверждён. Создано видов работ: ${data.workItemsCreated}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка подтверждения', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(projectId, contractId, `/${importId}`), {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates', contractId] });
      toast({ title: 'Импорт отменён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return {
    estimateImport,
    isLoading,
    updateItemMutation,
    confirmMutation,
    deleteMutation,
  };
}
