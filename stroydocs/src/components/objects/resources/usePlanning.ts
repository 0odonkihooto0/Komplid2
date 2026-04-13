'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type MaterialRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'CANCELLED';

export const STATUS_LABELS: Record<MaterialRequestStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Подана',
  APPROVED: 'Согласована',
  IN_PROGRESS: 'В закупке',
  DELIVERED: 'Поставлена',
  CANCELLED: 'Отменена',
};

export interface RequestsFilter {
  status?: MaterialRequestStatus | '';
  from?: string;
  to?: string;
}

export interface MaterialRequestItem {
  id: string;
  number: string;
  status: MaterialRequestStatus;
  deliveryDate: string | null;
  notes: string | null;
  createdAt: string;
  supplierOrg: { id: string; name: string } | null;
  _count: { items: number };
}

export interface GprMaterialItem {
  ganttTaskId: string;
  ganttTaskName: string;
  planStart: string | null;
  planEnd: string | null;
  materialId: string;
  materialName: string;
  materialUnit: string | null;
  quantityReceived: number;
  quantityUsed: number;
  quantityRemaining: number;
}

export interface GanttVersionOption {
  id: string;
  name: string;
  isActive: boolean;
  isBaseline: boolean;
  stage: { id: string; name: string } | null;
  taskCount: number;
}

// ─── Типы ресурсов ГПР ───────────────────────────────────────────────────────

export type GprResourceType = 'machines' | 'works' | 'labor';

export interface GprMachineItem {
  ganttTaskId: string;
  ganttTaskName: string;
  planStart: string | null;
  planEnd: string | null;
  machineHours: number;
}

export interface GprWorkItem {
  ganttTaskId: string;
  ganttTaskName: string;
  workType: string | null;
  volume: number | null;
  volumeUnit: string | null;
  planStart: string | null;
  planEnd: string | null;
  status: string;
  workItemName: string | null;
}

export interface GprLaborItem {
  ganttTaskId: string;
  ganttTaskName: string;
  planStart: string | null;
  planEnd: string | null;
  manHours: number;
}

// ─── Хуки для ЛРВ ────────────────────────────────────────────────────────────

export function useRequests(objectId: string, filters?: RequestsFilter) {
  const { data, isLoading } = useQuery<{ data: MaterialRequestItem[]; total: number }>({
    queryKey: ['material-requests', objectId, filters],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (filters?.status) sp.set('status', filters.status);
      if (filters?.from) sp.set('from', filters.from);
      if (filters?.to) sp.set('to', filters.to);
      const query = sp.toString() ? `?${sp.toString()}` : '';
      const res = await fetch(`/api/projects/${objectId}/material-requests${query}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки заявок');
      return json;
    },
    enabled: !!objectId,
  });
  return { requests: data?.data ?? [], total: data?.total ?? 0, isLoading };
}

export function useCreateRequest(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { number: string }) => {
      const res = await fetch(`/api/projects/${objectId}/material-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания заявки');
      return json.data as MaterialRequestItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-requests', objectId] });
      toast({ title: 'ЛРВ создана' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCreateFromGpr(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: {
      ganttVersionId: string;
      ganttTaskIds: string[];
      number: string;
      notes?: string;
    }) => {
      const res = await fetch(`/api/projects/${objectId}/material-requests/from-gpr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания ЛРВ из ГПР');
      return json.data as MaterialRequestItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-requests', objectId] });
      toast({ title: 'ЛРВ из ГПР создана' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хуки для ГПР и ресурсов ─────────────────────────────────────────────────

export function useGanttVersions(objectId: string) {
  const { data, isLoading } = useQuery<GanttVersionOption[]>({
    queryKey: ['gantt-versions-for-planning', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/gantt-versions`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки версий ГПР');
      return json.data;
    },
    enabled: !!objectId,
  });
  return { versions: data ?? [], isLoading };
}

export function useGprMaterials(
  objectId: string,
  params: { ganttVersionId: string | null; from?: string; to?: string }
) {
  const { ganttVersionId, from, to } = params;
  const { data, isLoading } = useQuery<{ materials: GprMaterialItem[]; total: number }>({
    queryKey: ['gpr-materials', objectId, ganttVersionId, from, to],
    queryFn: async () => {
      const sp = new URLSearchParams({ ganttVersionId: ganttVersionId! });
      if (from) sp.set('from', from);
      if (to) sp.set('to', to);
      const res = await fetch(`/api/projects/${objectId}/gpr-materials?${sp}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки материалов ГПР');
      return json.data;
    },
    enabled: !!objectId && !!ganttVersionId,
  });
  return { materials: data?.materials ?? [], total: data?.total ?? 0, isLoading };
}

export function useGprResources<T>(
  objectId: string,
  params: {
    ganttVersionId: string | null;
    resourceType: GprResourceType;
    from?: string;
    to?: string;
  }
) {
  const { ganttVersionId, resourceType, from, to } = params;
  const { data, isLoading } = useQuery<{ items: T[]; total: number }>({
    queryKey: ['gpr-resources', objectId, ganttVersionId, resourceType, from, to],
    queryFn: async () => {
      const sp = new URLSearchParams({
        ganttVersionId: ganttVersionId!,
        resourceType,
      });
      if (from) sp.set('from', from);
      if (to) sp.set('to', to);
      const res = await fetch(`/api/projects/${objectId}/gpr-resources?${sp}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки ресурсов ГПР');
      return json.data;
    },
    enabled: !!objectId && !!ganttVersionId,
  });
  return { items: data?.items ?? [], total: data?.total ?? 0, isLoading };
}
