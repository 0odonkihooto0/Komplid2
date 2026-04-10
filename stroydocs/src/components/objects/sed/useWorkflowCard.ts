'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/useToast';

// ---- Интерфейсы ----

export interface WorkflowApprovalStep {
  id: string;
  stepIndex: number;
  status: 'WAITING' | 'APPROVED' | 'REJECTED';
  role: string;
  comment: string | null;
  decidedAt: string | null;
  user: { id: string; firstName: string; lastName: string; position?: string | null } | null;
}

export interface WorkflowApprovalRoute {
  id: string;
  status: string;
  currentStepIdx: number | null;
  steps: WorkflowApprovalStep[];
}

export interface WorkflowMessage {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
}

export interface WorkflowDetail {
  id: string;
  number: string;
  workflowType: string;
  status: string;
  sentAt: string | null;
  completedAt: string | null;
  initiator: { id: string; firstName: string; lastName: string; position?: string | null };
  regulation: { id: string; name: string } | null;
  approvalRoute: WorkflowApprovalRoute | null;
  messages: WorkflowMessage[];
  document: { id: string; title: string; number: string; status: string; docType: string };
}

// ---- Хук ----

export function useWorkflowCard(objectId: string, docId: string, workflowId: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [messageHtml, setMessageHtml] = useState('');
  const [showRedirectDialog, setShowRedirectDialog] = useState(false);
  const [showRejectInline, setShowRejectInline] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const detailKey = ['workflow-detail', workflowId];
  const docKey = ['sed-card', docId];

  const baseUrl = `/api/projects/${objectId}/sed/${docId}/workflows/${workflowId}`;

  const { data: workflow, isLoading } = useQuery<WorkflowDetail>({
    queryKey: detailKey,
    queryFn: async () => {
      const res = await fetch(baseUrl);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки карточки ДО');
      return json.data;
    },
    enabled: Boolean(workflowId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: detailKey });
    queryClient.invalidateQueries({ queryKey: docKey });
  };

  // Определяем является ли текущий пользователь участником активного шага
  const route = workflow?.approvalRoute;
  const currentStep =
    route?.currentStepIdx != null ? route.steps[route.currentStepIdx] : undefined;
  const isCurrentParticipant =
    Boolean(currentStep?.user?.id === session?.user.id && route?.status === 'PENDING');

  const approveMutation = useMutation({
    mutationFn: async (comment?: string) => {
      const res = await fetch(`${baseUrl}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка согласования');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Шаг согласован' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (comment: string) => {
      const res = await fetch(`${baseUrl}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка отклонения');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      setShowRejectInline(false);
      setRejectComment('');
      toast({ title: 'ДО отклонён' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка отправки сообщения');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      setMessageHtml('');
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const createOnBasisMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/create-on-basis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания ДО на основании');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'ДО создан на основании' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  return {
    workflow,
    isLoading,
    isCurrentParticipant,
    messageHtml,
    setMessageHtml,
    showRedirectDialog,
    setShowRedirectDialog,
    showRejectInline,
    setShowRejectInline,
    rejectComment,
    setRejectComment,
    approveMutation,
    rejectMutation,
    sendMessageMutation,
    createOnBasisMutation,
    invalidate,
  };
}
