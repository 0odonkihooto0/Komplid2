'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { SEDStatus } from './useSEDList';

export interface SEDAttachment {
  id: string;
  fileName: string;
  s3Key: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface SEDApprovalStep {
  id: string;
  stepIndex: number;
  status: 'WAITING' | 'APPROVED' | 'REJECTED';
  role: string;
  comment: string | null;
  decidedAt: string | null;
  user: { id: string; firstName: string; lastName: string } | null;
}

export interface SEDApprovalRoute {
  id: string;
  status: string;
  currentStepIdx: number | null;
  steps: SEDApprovalStep[];
}

export interface SEDDocument {
  id: string;
  number: string;
  docType: string;
  title: string;
  body: string | null;
  status: SEDStatus;
  tags: string[];
  createdAt: string;
  receiverOrgIds: string[];
  senderOrg: { id: string; name: string; inn: string };
  author: { id: string; firstName: string; lastName: string };
  attachments: SEDAttachment[];
  approvalRoute: SEDApprovalRoute | null;
}

export function useSEDDetail(objectId: string, docId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const detailKey = ['sed-detail', docId];
  const listKey = ['sed', objectId];

  const { data: doc, isLoading } = useQuery<SEDDocument>({
    queryKey: detailKey,
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/sed/${docId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки документа');
      return json.data;
    },
    enabled: Boolean(docId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: detailKey });
    queryClient.invalidateQueries({ queryKey: listKey });
  };

  const patchMutation = useMutation({
    mutationFn: async (payload: { status: SEDStatus }) => {
      const res = await fetch(`/api/objects/${objectId}/sed/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления');
      return json.data;
    },
    onSuccess: (_data, { status }) => {
      invalidate();
      const labels: Partial<Record<SEDStatus, string>> = {
        ACTIVE: 'Документ активирован',
        ARCHIVED: 'Документ перемещён в архив',
      };
      toast({ title: labels[status] ?? 'Статус обновлён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const startWorkflowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/sed/${docId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка запуска согласования');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Согласование запущено' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return {
    doc,
    isLoading,
    patchMutation,
    startWorkflowMutation,
  };
}
