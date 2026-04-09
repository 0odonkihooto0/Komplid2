'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import type { RemediationActStatus, PrescriptionType, DefectCategory, DefectStatus } from '@prisma/client';

// === Типы ===

interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
}

interface DefectRef {
  id: string;
  title: string;
  category: DefectCategory;
  status: DefectStatus;
  assignee: UserRef | null;
}

export interface RemediationActListItem {
  id: string;
  number: string;
  status: RemediationActStatus;
  issuedAt: string;
  createdAt: string;
  issuedBy: UserRef;
  prescription: { id: string; number: string; type: PrescriptionType };
  inspection: { id: string; number: string };
}

export interface RemediationActDetail extends RemediationActListItem {
  defectIds: string[];
  remediationDetails: Record<string, { measures: string; note?: string }> | null;
  approvalRoute: null;
  defects: DefectRef[];
}

export interface RemediationActFilters {
  status?: string;
}

// === Хуки чтения ===

/** Реестр актов устранения по объекту */
export function useRemediationActs(objectId: string, filters: RemediationActFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);

  return useQuery<{ data: RemediationActListItem[]; total: number; page: number; limit: number }>({
    queryKey: ['sk-remediation-acts', objectId, filters],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/remediation-acts?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки актов устранения');
      return json.data;
    },
    enabled: !!objectId,
  });
}

/** Детальная карточка акта устранения */
export function useRemediationAct(objectId: string, actId: string) {
  return useQuery<RemediationActDetail>({
    queryKey: ['sk-remediation-act', objectId, actId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/remediation-acts/${actId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки акта устранения');
      return json.data;
    },
    enabled: !!objectId && !!actId,
  });
}

// === Хуки мутаций ===

/** Создать акт устранения (из визарда) */
export function useCreateRemediationAct(objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      number: string;
      inspectionId: string;
      prescriptionId: string;
      defectIds: string[];
      remediationDetails?: Record<string, { measures: string; note?: string }>;
    }) => {
      const res = await fetch(`/api/projects/${objectId}/remediation-acts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания акта устранения');
      return json.data as RemediationActListItem;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sk-remediation-acts', objectId] });
      toast({ title: 'Акт устранения создан' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

/** Отправить акт на проверку (DRAFT → PENDING_REVIEW) */
export function useSubmitRemediationAct(objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (actId: string) => {
      const res = await fetch(`/api/projects/${objectId}/remediation-acts/${actId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING_REVIEW' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка отправки акта на проверку');
      return json.data;
    },
    onSuccess: (_data, actId) => {
      void qc.invalidateQueries({ queryKey: ['sk-remediation-act', objectId, actId] });
      void qc.invalidateQueries({ queryKey: ['sk-remediation-acts', objectId] });
      toast({ title: 'Акт отправлен на проверку' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

/** Принять или отклонить акт устранения */
export function useApproveRemediationAct(objectId: string, actId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { decision: 'ACCEPTED' | 'REJECTED'; comment?: string }) => {
      const res = await fetch(`/api/projects/${objectId}/remediation-acts/${actId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка согласования акта');
      return json.data;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['sk-remediation-act', objectId, actId] });
      void qc.invalidateQueries({ queryKey: ['sk-remediation-acts', objectId] });
      void qc.invalidateQueries({ queryKey: ['sk-defects', objectId] });
      toast({
        title: vars.decision === 'ACCEPTED' ? 'Акт принят' : 'Акт отклонён',
      });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}
