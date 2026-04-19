'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import type { DefectStatus, DefectCategory } from '@prisma/client';

export interface DefectItem {
  id: string;
  title: string;
  description: string | null;
  category: DefectCategory;
  status: DefectStatus;
  normativeRef: string | null;
  deadline: string | null;
  resolvedAt: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  projectId: string;
  contractId: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; firstName: string; lastName: string };
  assignee: { id: string; firstName: string; lastName: string } | null;
  contract: { id: string; number: string; name: string } | null;
  _count: { comments: number };
  // Поля для детальной карточки (СК-модуль)
  inspectionId?: string | null;
  prescriptionId?: string | null;
  inspection?: {
    id: string;
    number: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
  } | null;
  prescription?: {
    id: string;
    number: string;
    type: string;
    status: string;
    deadline: string | null;
  } | null;
  comments?: {
    id: string;
    text: string;
    statusChange: string | null;
    createdAt: string;
    author: { id: string; firstName: string; lastName: string };
  }[];
  // Нормативные ссылки из DefectNormativeRef[] (загружаются в детальной карточке)
  normativeRefs?: {
    id: string;
    reference: string;
    description: string | null;
  }[];
}

export interface DefectFilters {
  status?: string;
  category?: string;
  contractId?: string;
  assigneeId?: string;
  overdueOnly?: boolean;
}

export function useDefects(projectId: string, filters: DefectFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status)     params.set('status', filters.status);
  if (filters.category)   params.set('category', filters.category);
  if (filters.contractId) params.set('contractId', filters.contractId);
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters.overdueOnly) params.set('overdueOnly', 'true');

  return useQuery<{ data: DefectItem[]; total: number; page: number; limit: number }>({
    queryKey: ['defects', projectId, filters],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/defects?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки дефектов');
      return json.data;
    },
    enabled: !!projectId,
  });
}

export function useDefect(projectId: string, defectId: string) {
  return useQuery<DefectItem>({
    queryKey: ['defect', projectId, defectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/defects/${defectId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки дефекта');
      return json.data;
    },
    enabled: !!projectId && !!defectId,
  });
}

export function useCreateDefect(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<DefectItem>) => {
      const res = await fetch(`/api/projects/${projectId}/defects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания дефекта');
      return json.data as DefectItem;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['defects', projectId] });
      void qc.invalidateQueries({ queryKey: ['counts', 'object', projectId] });
      toast({ title: 'Дефект зафиксирован' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useChangeDefectStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      defectId,
      status,
      comment,
    }: {
      defectId: string;
      status: DefectStatus;
      comment?: string;
    }) => {
      const res = await fetch(`/api/projects/${projectId}/defects/${defectId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка смены статуса');
      return json.data as DefectItem;
    },
    onSuccess: (_data, { defectId }) => {
      void qc.invalidateQueries({ queryKey: ['defects', projectId] });
      void qc.invalidateQueries({ queryKey: ['defect', projectId, defectId] });
      toast({ title: 'Статус дефекта обновлён' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useDeleteDefect(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (defectId: string) => {
      const res = await fetch(`/api/projects/${projectId}/defects/${defectId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления дефекта');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['defects', projectId] });
      toast({ title: 'Дефект удалён' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useAcceptDefect(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ defectId, comment }: { defectId: string; comment?: string }) => {
      const res = await fetch(`/api/projects/${projectId}/defects/${defectId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка подтверждения устранения');
      return json.data as DefectItem;
    },
    onSuccess: (_data, { defectId }) => {
      void qc.invalidateQueries({ queryKey: ['defects', projectId] });
      void qc.invalidateQueries({ queryKey: ['defect', projectId, defectId] });
      toast({ title: 'Устранение подтверждено' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useRejectDefect(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ defectId, comment }: { defectId: string; comment: string }) => {
      const res = await fetch(`/api/projects/${projectId}/defects/${defectId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка возврата на доработку');
      return json.data as DefectItem;
    },
    onSuccess: (_data, { defectId }) => {
      void qc.invalidateQueries({ queryKey: ['defects', projectId] });
      void qc.invalidateQueries({ queryKey: ['defect', projectId, defectId] });
      toast({ title: 'Дефект возвращён на доработку' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useExtendDefectDeadline(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      defectId,
      deadline,
      reason,
    }: {
      defectId: string;
      deadline: string;
      reason: string;
    }) => {
      const res = await fetch(`/api/projects/${projectId}/defects/${defectId}/extend-deadline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline, reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка продления срока');
      return json.data as DefectItem;
    },
    onSuccess: (_data, { defectId }) => {
      void qc.invalidateQueries({ queryKey: ['defects', projectId] });
      void qc.invalidateQueries({ queryKey: ['defect', projectId, defectId] });
      toast({ title: 'Срок устранения продлён' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}
