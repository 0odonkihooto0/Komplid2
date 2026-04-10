'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { SEDStatus } from './useSEDList';

// ---- Интерфейсы ----

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

export interface SEDWorkflowItem {
  id: string;
  number: string;
  workflowType: string;
  status: string;
  initiator: { id: string; firstName: string; lastName: string };
  sentAt: string | null;
  completedAt: string | null;
  approvalRoute: SEDApprovalRoute | null;
}

export interface SEDLink {
  id: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface SEDDocumentFull {
  id: string;
  number: string;
  docType: string;
  title: string;
  body: string | null;
  status: SEDStatus;
  tags: string[];
  observers: string[];
  isRead: boolean;
  readAt: string | null;
  incomingNumber: string | null;
  outgoingNumber: string | null;
  date: string | null;
  createdAt: string;
  receiverOrgIds: string[];
  senderOrg: { id: string; name: string; inn: string | null };
  receiverOrg: { id: string; name: string; inn: string | null } | null;
  senderUser: { id: string; firstName: string; lastName: string } | null;
  receiverUser: { id: string; firstName: string; lastName: string } | null;
  author: { id: string; firstName: string; lastName: string };
  attachments: SEDAttachment[];
  approvalRoute: SEDApprovalRoute | null;
  workflows: SEDWorkflowItem[];
  links: SEDLink[];
}

// ---- Хук ----

export function useSEDDocumentCard(objectId: string, docId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('info');
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  const detailKey = ['sed-card', docId];
  const listKey = ['sed', objectId];

  const { data: doc, isLoading } = useQuery<SEDDocumentFull>({
    queryKey: detailKey,
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/sed/${docId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки документа');
      return json.data;
    },
    enabled: Boolean(docId),
  });

  // Устанавливаем первый workflow как активный при загрузке
  useEffect(() => {
    if (doc?.workflows?.length && !activeWorkflowId) {
      setActiveWorkflowId(doc.workflows[0].id);
    }
  }, [doc?.workflows, activeWorkflowId]);

  // Авто-маркировка isRead при открытии получателем
  useEffect(() => {
    if (!doc || doc.isRead) return;
    fetch(`/api/objects/${objectId}/sed/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds: [docId], isRead: true }),
    }).catch(() => {
      // Не показываем ошибку — фоновое действие
    });
  }, [doc?.id, doc?.isRead, objectId, docId]);

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

  const addLinkMutation = useMutation({
    mutationFn: async (payload: { entityType: string; entityId: string }) => {
      const res = await fetch(`/api/projects/${objectId}/sed/${docId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка добавления связи');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Связь добавлена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const activeWorkflow = doc?.workflows?.find((w) => w.id === activeWorkflowId) ?? null;

  return {
    doc,
    isLoading,
    activeTab,
    setActiveTab,
    activeWorkflowId,
    setActiveWorkflowId,
    activeWorkflow,
    patchMutation,
    startWorkflowMutation,
    addLinkMutation,
  };
}
