'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import type { DefectCategory, DefectStatus, InspectionStatus, PrescriptionType, PrescriptionStatus, RemediationActStatus } from '@prisma/client';

// === Типы данных ===

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface InspectionListItem {
  id: string;
  number: string;
  status: InspectionStatus;
  startedAt: string;
  completedAt: string | null;
  comment: string | null;
  contractorPresent: boolean | null;
  ganttTaskIds: string[];
  inspector: UserRef;
  responsible: UserRef | null;
  createdBy: UserRef;
  _count: { defects: number; prescriptions: number; inspectionActs: number };
}

export interface DefectInInspection {
  id: string;
  title: string;
  description: string | null;
  category: DefectCategory;
  status: DefectStatus;
  normativeRef: string | null;
  deadline: string | null;
  requiresSuspension: boolean;
  gpsLat: number | null;
  gpsLng: number | null;
  createdAt: string;
  author: UserRef;
  assignee: UserRef | null;
}

export interface InspectionActItem {
  id: string;
  number: string;
  issuedAt: string;
  s3Key: string | null;
  issuedBy: UserRef & { organization?: { name: string } | null };
}

export interface PrescriptionItem {
  id: string;
  number: string;
  type: PrescriptionType;
  status: PrescriptionStatus;
  issuedAt: string;
  deadline: string | null;
  issuedBy: UserRef;
  responsible: UserRef | null;
  _count: { defects: number };
}

export interface RemediationActItem {
  id: string;
  number: string;
  status: RemediationActStatus;
  createdAt: string;
  issuedBy: UserRef;
}

export interface InspectionDetail extends InspectionListItem {
  attachmentS3Keys: string[];
  defects: DefectInInspection[];
  inspectionActs: InspectionActItem[];
  prescriptions: PrescriptionItem[];
  remediationActs: RemediationActItem[];
}

export interface InspectionFilters {
  status?: string;
}

// === Хуки ===

export function useInspections(objectId: string, filters: InspectionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);

  return useQuery<{ data: InspectionListItem[]; total: number; page: number; limit: number }>({
    queryKey: ['inspections', objectId, filters],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/inspections?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки проверок');
      return json.data;
    },
    enabled: !!objectId,
  });
}

export function useInspection(objectId: string, inspectionId: string) {
  return useQuery<InspectionDetail>({
    queryKey: ['inspection', objectId, inspectionId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/inspections/${inspectionId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки проверки');
      return json.data;
    },
    enabled: !!objectId && !!inspectionId,
  });
}

export function useCreateInspection(objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      number: string;
      inspectorId: string;
      responsibleId?: string;
      comment?: string;
      contractorPresent?: boolean;
    }) => {
      const res = await fetch(`/api/projects/${objectId}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания проверки');
      return json.data as InspectionListItem;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inspections', objectId] });
      toast({ title: 'Проверка начата' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useCompleteInspection(objectId: string, inspectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/inspections/${inspectionId}/complete`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка завершения проверки');
      return json.data as InspectionListItem;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inspection', objectId, inspectionId] });
      void qc.invalidateQueries({ queryKey: ['inspections', objectId] });
      toast({ title: 'Проверка завершена', description: 'Созданы акт проверки и предписания' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useAddDefectToInspection(objectId: string, inspectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      category: DefectCategory;
      normativeRef?: string;
      assigneeId?: string;
      deadline?: string;
      requiresSuspension: boolean;
      gpsLat?: number;
      gpsLng?: number;
      substituteInspectorId?: string;
    }) => {
      const res = await fetch(`/api/projects/${objectId}/inspections/${inspectionId}/add-defect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка добавления недостатка');
      return json.data as DefectInInspection;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inspection', objectId, inspectionId] });
      toast({ title: 'Недостаток зафиксирован' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function usePatchInspection(objectId: string, inspectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      comment?: string;
      responsibleId?: string | null;
      contractorPresent?: boolean;
      attentionUserId?: string | null;
      ganttTaskIds?: string[];
    }) => {
      const res = await fetch(`/api/projects/${objectId}/inspections/${inspectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления проверки');
      return json.data as InspectionDetail;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inspection', objectId, inspectionId] });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export interface InspectionAttachment {
  s3Key: string;
  fileName: string;
  downloadUrl: string;
}

export function useInspectionAttachments(objectId: string, inspectionId: string, enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery<InspectionAttachment[]>({
    queryKey: ['inspection-attachments', objectId, inspectionId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/inspections/${inspectionId}/attachments`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки файлов');
      return json.data as InspectionAttachment[];
    },
    enabled: enabled && !!objectId && !!inspectionId,
    staleTime: 30 * 1000,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(
        `/api/projects/${objectId}/inspections/${inspectionId}/attachments`,
        { method: 'POST', body: fd },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки файла');
      return json.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inspection-attachments', objectId, inspectionId] });
      void qc.invalidateQueries({ queryKey: ['inspection', objectId, inspectionId] });
      toast({ title: 'Файл прикреплён' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка загрузки', description: err.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (s3Key: string) => {
      const res = await fetch(
        `/api/projects/${objectId}/inspections/${inspectionId}/attachments?key=${encodeURIComponent(s3Key)}`,
        { method: 'DELETE' },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления файла');
      return json.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inspection-attachments', objectId, inspectionId] });
      void qc.invalidateQueries({ queryKey: ['inspection', objectId, inspectionId] });
      toast({ title: 'Файл удалён' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка удаления', description: err.message, variant: 'destructive' }),
  });

  return { query, upload, remove };
}
