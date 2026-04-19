'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import type { RFIStatus, RFIPriority } from './useRFIList';

export interface RFIAttachment {
  id: string;
  fileName: string;
  s3Key: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface RFIDetail {
  id: string;
  number: string;
  title: string;
  description: string;
  status: RFIStatus;
  priority: RFIPriority;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  linkedDocId: string | null;
  linkedDocType: string | null;
  author: { id: string; firstName: string; lastName: string };
  assignee: { id: string; firstName: string; lastName: string } | null;
  answeredBy: { id: string; firstName: string; lastName: string } | null;
  response: string | null;
  answeredAt: string | null;
  attachments: RFIAttachment[];
}

export function useRFIDetail(objectId: string, rfiId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const detailKey = ['rfi-detail', rfiId];
  const listKey = ['rfi', objectId];

  const { data: rfi, isLoading } = useQuery<RFIDetail>({
    queryKey: detailKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/rfi/${rfiId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки вопроса');
      return json.data;
    },
    enabled: Boolean(rfiId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: detailKey });
    queryClient.invalidateQueries({ queryKey: listKey });
  };

  const answerMutation = useMutation({
    mutationFn: async (response: string) => {
      const res = await fetch(`/api/projects/${objectId}/rfi/${rfiId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка при отправке ответа');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Ответ отправлен' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/rfi/${rfiId}/close`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка закрытия');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Вопрос закрыт' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (priority: RFIPriority) => {
      const res = await fetch(`/api/projects/${objectId}/rfi/${rfiId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Приоритет обновлён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const goBack = () => router.push(`/objects/${objectId}/info/rfi`);

  return {
    rfi,
    isLoading,
    answerMutation,
    closeMutation,
    updatePriorityMutation,
    goBack,
  };
}
