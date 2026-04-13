'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type MaterialRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'CANCELLED';

export interface RequestItemData {
  id: string;
  quantity: number;
  quantityOrdered: number;
  unit: string | null;
  unitPrice: number | null;
  notes: string | null;
  status: string | null;
  nomenclatureId: string | null;
  nomenclature: { id: string; name: string; unit: string | null } | null;
}

export interface RequestCardData {
  id: string;
  number: string;
  status: MaterialRequestStatus;
  deliveryDate: string | null;
  notes: string | null;
  supplierOrgId: string | null;
  managerId: string | null;
  responsibleId: string | null;
  createdAt: string;
  updatedAt: string;
  items: RequestItemData[];
  // Ключи S3 прикреплённых файлов — возвращаются из include автоматически
  attachmentS3Keys: string[];
  _count: { items: number; orders: number; comments: number };
}

// ─── Метки статусов ──────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<MaterialRequestStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Подана',
  APPROVED: 'Согласована',
  IN_PROGRESS: 'В закупке',
  DELIVERED: 'Поставлена',
  CANCELLED: 'Отменена',
};

export const STATUS_VARIANTS: Record<
  MaterialRequestStatus,
  'secondary' | 'default' | 'outline' | 'destructive'
> = {
  DRAFT: 'secondary',
  SUBMITTED: 'default',
  APPROVED: 'default',
  IN_PROGRESS: 'default',
  DELIVERED: 'outline',
  CANCELLED: 'destructive',
};

// ─── Хук загрузки карточки ───────────────────────────────────────────────────

export function useRequestCard(objectId: string, requestId: string) {
  const { data, isLoading, error } = useQuery<RequestCardData>({
    queryKey: ['material-request', objectId, requestId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/material-requests/${requestId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки заявки');
      return json.data as RequestCardData;
    },
    enabled: !!objectId && !!requestId,
  });
  return { request: data ?? null, isLoading, error };
}

// ─── Хук обновления заявки ───────────────────────────────────────────────────

export function useUpdateRequest(objectId: string, requestId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: Partial<{
      status: MaterialRequestStatus;
      deliveryDate: string | null;
      notes: string | null;
      supplierOrgId: string | null;
      managerId: string | null;
      responsibleId: string | null;
    }>) => {
      const res = await fetch(`/api/projects/${objectId}/material-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления заявки');
      return json.data as RequestCardData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-request', objectId, requestId] });
      qc.invalidateQueries({ queryKey: ['material-requests', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук добавления позиции ──────────────────────────────────────────────────

export function useAddItem(objectId: string, requestId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { quantity: number; unit?: string; notes?: string }) => {
      const res = await fetch(
        `/api/projects/${objectId}/material-requests/${requestId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка добавления позиции');
      return json.data as RequestItemData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-request', objectId, requestId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук обновления позиции ──────────────────────────────────────────────────

export function useUpdateItem(objectId: string, requestId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: Partial<{
        quantity: number;
        unit: string | null;
        unitPrice: number | null;
        notes: string | null;
        status: string | null;
      }>;
    }) => {
      const res = await fetch(
        `/api/projects/${objectId}/material-requests/${requestId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления позиции');
      return json.data as RequestItemData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-request', objectId, requestId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук удаления позиции ────────────────────────────────────────────────────

export function useDeleteItem(objectId: string, requestId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(
        `/api/projects/${objectId}/material-requests/${requestId}/items/${itemId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления позиции');
      return itemId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-request', objectId, requestId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук создания заказа поставщику ─────────────────────────────────────────

export function useCreateOrder(objectId: string, requestId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { notes?: string }) => {
      const res = await fetch(
        `/api/projects/${objectId}/material-requests/${requestId}/create-order`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body ?? {}),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания заказа');
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-request', objectId, requestId] });
      qc.invalidateQueries({ queryKey: ['material-requests', objectId] });
      toast({ title: 'Заказ поставщику создан' });
      // Переходим на вкладку Закупки
      router.push(`/objects/${objectId}/resources/procurement`);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
