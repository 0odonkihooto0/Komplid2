'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ExecutionDocType } from '@prisma/client';

interface GeneralDocData {
  title?: string;
  documentDate?: string; // ISO-строка
  note?: string;
  attachmentS3Keys?: string[];
}

interface AttachmentItem {
  s3Key: string;
  fileName: string;
  downloadUrl: string;
}

export function useGeneralDoc(objectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  /** Создать новый документ типа GENERAL_DOCUMENT (или другой указанный тип) */
  const createMutation = useMutation({
    mutationFn: async (data: { type: ExecutionDocType; title?: string; documentDate?: string; note?: string }) => {
      const res = await fetch(
        `/api/objects/${objectId}/contracts/${contractId}/execution-docs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: data.type, title: data.title }),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания документа');

      // Если есть дополнительные поля — сохраняем отдельным PATCH
      const docId = json.data.id as string;
      if (data.documentDate || data.note) {
        await fetch(
          `/api/objects/${objectId}/contracts/${contractId}/execution-docs/${docId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentDate: data.documentDate, note: data.note }),
          },
        );
      }

      return json.data as { id: string; number: string; title: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Документ создан' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка создания', description: error.message, variant: 'destructive' });
    },
  });

  /** Обновить поля документа (title, documentDate, note, attachmentS3Keys) */
  const updateMutation = useMutation({
    mutationFn: async ({ docId, data }: { docId: string; data: GeneralDocData }) => {
      const res = await fetch(
        `/api/objects/${objectId}/contracts/${contractId}/execution-docs/${docId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка сохранения');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Сохранено' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка сохранения', description: error.message, variant: 'destructive' });
    },
  });

  /** Провести документ (перевести в статус IN_REVIEW) */
  const submitMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(
        `/api/objects/${objectId}/contracts/${contractId}/execution-docs/${docId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IN_REVIEW' }),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка проведения');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Документ проведён', description: 'Статус изменён на «На проверке»' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  /** Загрузить файл-вложение к документу */
  const uploadAttachment = async (docId: string, file: File): Promise<AttachmentItem | null> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `/api/objects/${objectId}/contracts/${contractId}/execution-docs/${docId}/attachments`,
        { method: 'POST', body: formData },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки файла');
      toast({ title: 'Файл загружен' });
      return null; // Обновить список вложений через refetch
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка загрузки';
      toast({ title: 'Ошибка загрузки', description: msg, variant: 'destructive' });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  /** Удалить файл-вложение */
  const deleteAttachment = async (docId: string, s3Key: string): Promise<boolean> => {
    try {
      const res = await fetch(
        `/api/objects/${objectId}/contracts/${contractId}/execution-docs/${docId}/attachments?key=${encodeURIComponent(s3Key)}`,
        { method: 'DELETE' },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast({ title: 'Файл удалён' });
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка удаления';
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' });
      return false;
    }
  };

  return {
    createMutation,
    updateMutation,
    submitMutation,
    uploadAttachment,
    deleteAttachment,
    isUploading,
  };
}
