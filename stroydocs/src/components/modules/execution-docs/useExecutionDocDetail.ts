'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ExecutionDocType, ExecutionDocStatus } from '@prisma/client';

interface ExecutionDocDetail {
  id: string;
  type: ExecutionDocType;
  status: ExecutionDocStatus;
  number: string;
  title: string;
  s3Key: string | null;
  fileName: string | null;
  generatedAt: string | null;
  downloadUrl: string | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string; middleName: string | null };
  // Поля ручного редактирования (Фаза 3.6)
  overrideFields: Record<string, string> | null;
  overrideHtml: string | null;
  lastEditedAt: string | null;
  lastEditedById: string | null;
  suggestedFields: Record<string, string> | null;
  workRecord: {
    date: string | null;
    workItem: {
      name: string;
      projectCipher: string;
      normatives: string | null;
      ksiNode: { code: string; name: string };
    };
  } | null;
  qrToken: string | null;
  // Поля XML-экспорта (Модуль 10, Шаг 8)
  xmlExportedAt: string | null;
  xmlS3Key: string | null;
  signatures: Array<{
    id: string;
    signedAt: string;
    user: { id: string; firstName: string; lastName: string };
  }>;
  comments: Array<{
    id: string;
    text: string;
    status: 'OPEN' | 'RESOLVED';
    author: { id: string; firstName: string; lastName: string };
  }>;
}

export function useExecutionDocDetail(projectId: string, contractId: string, docId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const baseUrl = `/api/projects/${projectId}/contracts/${contractId}/execution-docs/${docId}`;

  const { data: doc, isLoading } = useQuery<ExecutionDocDetail>({
    queryKey: ['execution-doc', docId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/generate-pdf`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'PDF сгенерирован' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка генерации PDF', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: ExecutionDocStatus) => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Статус обновлён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const autofillFromAosrMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/autofill-from-aosr`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      toast({ title: `ОЖР обновлён: ${data.aosrCount} записей из АОСР` });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка автозаполнения', description: error.message, variant: 'destructive' });
    },
  });

  const generateQrMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/qr`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      toast({ title: 'QR-код создан' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка создания QR-кода', description: error.message, variant: 'destructive' });
    },
  });

  const exportXmlMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/export-xml`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { downloadUrl: string; fileName: string; xmlExportedAt: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      toast({ title: 'XML сгенерирован' });
      window.open(data.downloadUrl, '_blank');
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка XML-экспорта', description: error.message, variant: 'destructive' });
    },
  });

  const unpostMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/unpost`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Проведение отменено — документ возвращён в черновик' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка отмены проведения', description: error.message, variant: 'destructive' });
    },
  });

  return { doc, isLoading, generatePdfMutation, updateStatusMutation, autofillFromAosrMutation, generateQrMutation, exportXmlMutation, unpostMutation };
}
