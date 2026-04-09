'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import type { CorrespondenceStatus } from './useCorrespondenceList';

export interface CorrespondenceAttachment {
  id: string;
  fileName: string;
  s3Key: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface CorrespondenceDetail {
  id: string;
  number: string;
  direction: 'OUTGOING' | 'INCOMING';
  subject: string;
  body: string | null;
  status: CorrespondenceStatus;
  sentAt: string | null;
  createdAt: string;
  tags: string[];
  senderOrg: { id: string; name: string; inn: string };
  receiverOrg: { id: string; name: string; inn: string };
  author: { id: string; firstName: string; lastName: string };
  attachments: CorrespondenceAttachment[];
  approvalRoute: {
    id: string;
    steps: {
      id: string;
      stepIndex: number;
      status: string;
      comment: string | null;
      user: { id: string; firstName: string; lastName: string } | null;
    }[];
  } | null;
}

export function useCorrespondenceDetail(objectId: string, corrId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const detailKey = ['correspondence-detail', corrId];
  const listKey = ['correspondence', objectId];

  const { data: correspondence, isLoading } = useQuery<CorrespondenceDetail>({
    queryKey: detailKey,
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/correspondence/${corrId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки письма');
      return json.data;
    },
    enabled: Boolean(corrId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: detailKey });
    queryClient.invalidateQueries({ queryKey: listKey });
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/correspondence/${corrId}/send`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка отправки');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Письмо отправлено' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/correspondence/${corrId}/archive`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка архивации');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Письмо перемещено в архив' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/correspondence/${corrId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      toast({ title: 'Черновик удалён' });
      router.push(`/objects/${objectId}/info/correspondence`);
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return {
    correspondence,
    isLoading,
    sendMutation,
    archiveMutation,
    deleteMutation,
  };
}
