'use client';

// Хук для работы с вложениями заявок и складских документов

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface ResourceAttachment {
  s3Key: string;
  fileName: string;
  downloadUrl: string;
}

// ─── Хук вложений ────────────────────────────────────────────────────────────

export function useAttachments(apiBasePath: string, parentQueryKey: unknown[]) {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Загрузка списка вложений
  const { data, isLoading } = useQuery<ResourceAttachment[]>({
    queryKey: ['attachments', apiBasePath],
    queryFn: async () => {
      const res = await fetch(`${apiBasePath}/attachments`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки вложений');
      return json.data.attachments as ResourceAttachment[];
    },
  });

  // Загрузка файла на сервер
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      // Не устанавливаем Content-Type — браузер сам задаёт multipart/form-data с boundary
      const res = await fetch(`${apiBasePath}/attachments`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки файла');
      return json.data as ResourceAttachment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', apiBasePath] });
      qc.invalidateQueries({ queryKey: parentQueryKey });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка загрузки', description: err.message, variant: 'destructive' });
    },
  });

  // Удаление вложения по s3Key
  const remove = useMutation({
    mutationFn: async (s3Key: string) => {
      const res = await fetch(
        `${apiBasePath}/attachments?key=${encodeURIComponent(s3Key)}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления файла');
      return s3Key;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', apiBasePath] });
      qc.invalidateQueries({ queryKey: parentQueryKey });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка удаления', description: err.message, variant: 'destructive' });
    },
  });

  return {
    attachments: data ?? [],
    isLoading,
    upload,
    remove,
  };
}
