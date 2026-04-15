'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import type { PrescriptionType, PrescriptionStatus, DefectCategory, DefectStatus, RemediationActStatus } from '@prisma/client';

// === Типы ===

interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PrescriptionListItem {
  id: string;
  number: string;
  type: PrescriptionType;
  status: PrescriptionStatus;
  issuedAt: string;
  deadline: string | null;
  closedAt: string | null;
  issuedBy: UserRef;
  responsible: UserRef | null;
  inspection: { id: string; number: string };
  _count: { defects: number; remediationActs: number };
}

export interface PrescriptionFilters {
  status?: string;
  type?: string;
}

export interface DefectInPrescription {
  id: string;
  title: string;
  category: DefectCategory;
  status: DefectStatus;
  deadline: string | null;
  author: UserRef;
  assignee: UserRef | null;
  pendingRemediationActId: string | null;
  pendingRemediationActNumber: string | null;
}

export interface RemediationActInPrescription {
  id: string;
  number: string;
  status: RemediationActStatus;
  createdAt: string;
  issuedBy: UserRef;
}

export interface ApprovalStepData {
  id: string;
  stepIndex: number;
  role: string;
  status: 'WAITING' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  decidedAt: string | null;
  user: { id: string; firstName: string; lastName: string; position: string | null } | null;
}

export interface ApprovalRouteData {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESET';
  currentStepIdx: number;
  steps: ApprovalStepData[];
}

export interface PrescriptionDetail extends PrescriptionListItem {
  defects: DefectInPrescription[];
  remediationActs: RemediationActInPrescription[];
  approvalRoute: ApprovalRouteData | null;
}

// === Хуки ===

/** Реестр предписаний по объекту с фильтрами */
export function usePrescriptions(objectId: string, filters: PrescriptionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);

  return useQuery<{ data: PrescriptionListItem[]; total: number; page: number; limit: number }>({
    queryKey: ['prescriptions', objectId, filters],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/prescriptions?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки предписаний');
      return json.data;
    },
    enabled: !!objectId,
  });
}

/** Карточка предписания с дефектами, актами устранения и маршрутом согласования */
export function usePrescription(objectId: string, prescriptionId: string) {
  return useQuery<PrescriptionDetail>({
    queryKey: ['prescription', objectId, prescriptionId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/prescriptions/${prescriptionId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки предписания');
      return json.data;
    },
    enabled: !!objectId && !!prescriptionId,
  });
}

/** Запуск маршрута согласования предписания */
export function useStartPrescriptionApproval(objectId: string, prescriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/prescriptions/${prescriptionId}/approval`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка запуска согласования');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prescription', objectId, prescriptionId] });
      toast({ title: 'Маршрут согласования запущен' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

/** Принятие решения по шагу согласования предписания */
export function useDecidePrescriptionApproval(objectId: string, prescriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { decision: 'APPROVED' | 'REJECTED'; comment?: string }) => {
      const res = await fetch(
        `/api/projects/${objectId}/prescriptions/${prescriptionId}/approval/decide`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка принятия решения');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prescription', objectId, prescriptionId] });
      toast({ title: 'Решение сохранено' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

/** Сброс маршрута согласования предписания */
export function useResetPrescriptionApproval(objectId: string, prescriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/prescriptions/${prescriptionId}/approval`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка сброса маршрута');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prescription', objectId, prescriptionId] });
      toast({ title: 'Маршрут согласования сброшен' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}
