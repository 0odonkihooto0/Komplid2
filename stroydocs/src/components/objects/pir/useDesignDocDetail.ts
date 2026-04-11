'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import type { DesignDocStatus, ExpertiseStatus } from '@prisma/client';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

interface DocUser {
  id: string;
  firstName: string;
  lastName: string;
  position?: string | null;
}

interface DocOrg {
  id: string;
  name: string;
}

export interface ApprovalStep {
  id: string;
  stepIndex: number;
  role: string;
  status: 'WAITING' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  decidedAt: string | null;
  userId: string | null;
  user: DocUser | null;
}

export interface DocApprovalRoute {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESET';
  currentStepIdx: number;
  steps: ApprovalStep[];
}

export interface DesignDocVersion {
  id: string;
  number: string;
  version: number;
  createdAt: string;
}

export interface DesignDocDetail {
  id: string;
  number: string;
  name: string;
  docType: string;
  category: string | null;
  version: number;
  status: DesignDocStatus;
  notes: string | null;
  responsibleOrg: DocOrg | null;
  responsibleUser: DocUser | null;
  author: DocUser;
  // Файлы
  s3Keys: string[];
  currentS3Key: string | null;
  downloadUrl: string | null;
  // Экспертиза
  expertiseStatus: ExpertiseStatus | null;
  expertiseDate: string | null;
  expertiseComment: string | null;
  // QR
  qrToken: string | null;
  // Связи с ИД
  linkedExecDocIds: string[];
  // Согласование
  approvalRoute: DocApprovalRoute | null;
  // Версионирование
  versions: DesignDocVersion[];
  parentDoc: DesignDocVersion | null;
  // Мягкое удаление
  isDeleted: boolean;
  _count: { comments: number; changes: number };
  // Количество связанных BIM-элементов (из BimElementLink, entityType=DESIGN_DOC)
  timLinksCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─────────────────────────────────────────────
// Хук для карточки документа ПИР
// ─────────────────────────────────────────────

export function useDesignDocDetail(projectId: string, docId: string) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const baseUrl = `/api/objects/${projectId}/design-docs/${docId}`;

  const { data: doc, isLoading, isError } = useQuery<DesignDocDetail>({
    queryKey: ['design-doc', docId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки документа ПИР');
      const json: ApiResponse<DesignDocDetail> = await res.json();
      return json.data;
    },
    enabled: !!docId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['design-doc', docId] });

  const conductMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка проведения документа');
      }
    },
    onSuccess: () => {
      toast({ title: 'Документ переведён в работу' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка аннулирования документа');
      }
    },
    onSuccess: () => {
      toast({ title: 'Документ аннулирован' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const sendReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT_FOR_REVIEW' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка отправки на проверку');
      }
    },
    onSuccess: () => {
      toast({ title: 'Документ отправлен на проверку' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const approveReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REVIEW_PASSED' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка принятия проверки');
      }
    },
    onSuccess: () => {
      toast({ title: 'Проверка принята' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  // Создать СЭД-документ из карточки документа ПИР с полиморфной ссылкой
  const sendToSEDMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/send-to-sed`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка создания в СЭД');
      }
      const json: ApiResponse<{ sedDocId: string }> = await res.json();
      return json.data.sedDocId;
    },
    onSuccess: (sedDocId) => {
      router.push(`/objects/${projectId}/sed/${sedDocId}`);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  // Генерация PDF Листа согласования документа ПИР
  const printApprovalSheetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/approval-sheet`, { method: 'POST' });
      if (!res.ok) throw new Error('Ошибка генерации листа согласования');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `approval-sheet-${docId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  // Генерация PDF Листа подписания документа ПИР
  const printSigningSheetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/signing-sheet`, { method: 'POST' });
      if (!res.ok) throw new Error('Ошибка генерации листа подписания');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signing-sheet-${docId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    doc,
    isLoading,
    isError,
    conductMutation,
    cancelMutation,
    sendReviewMutation,
    approveReviewMutation,
    sendToSEDMutation,
    printApprovalSheetMutation,
    printSigningSheetMutation,
  };
}
