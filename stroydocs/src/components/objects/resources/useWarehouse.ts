'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type WarehouseMovementType =
  'RECEIPT' | 'SHIPMENT' | 'TRANSFER' | 'WRITEOFF' | 'RETURN'
  | 'RECEIPT_ORDER' | 'EXPENSE_ORDER';
export type MovementStatus = 'DRAFT' | 'CONDUCTED' | 'CANCELLED';

export interface MovementListItem {
  id: string;
  number: string;
  movementType: WarehouseMovementType;
  status: MovementStatus;
  movementDate: string;
  notes: string | null;
  fromWarehouse: { id: string; name: string } | null;
  toWarehouse: { id: string; name: string } | null;
  _count: { lines: number };
}

export interface WarehouseOption {
  id: string;
  name: string;
  isDefault: boolean;
  location: string | null;
}

// ─── Метки и классы статусов движения ────────────────────────────────────────

export const MOV_STATUS_LABELS: Record<MovementStatus, string> = {
  DRAFT: 'Черновик',
  CONDUCTED: 'Проведено',
  CANCELLED: 'Отменено',
};

export const MOV_STATUS_CLASS: Record<MovementStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONDUCTED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
};

// ─── Хук загрузки списка движений ────────────────────────────────────────────

export function useMovements(objectId: string, movementType?: WarehouseMovementType) {
  const { data, isLoading } = useQuery<{ data: MovementListItem[]; total: number }>({
    queryKey: ['warehouse-movements', objectId, movementType],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (movementType) sp.set('movementType', movementType);
      const query = sp.toString() ? `?${sp.toString()}` : '';
      const res = await fetch(`/api/projects/${objectId}/warehouse-movements${query}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки движений склада');
      return json;
    },
    enabled: !!objectId,
  });
  return { movements: data?.data ?? [], total: data?.total ?? 0, isLoading };
}

// ─── Хук загрузки списка складов объекта ─────────────────────────────────────

export function useWarehouses(objectId: string) {
  const { data, isLoading } = useQuery<{ data: WarehouseOption[] }>({
    queryKey: ['warehouses', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/warehouses`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки складов');
      return json;
    },
    enabled: !!objectId,
  });
  return { warehouses: data?.data ?? [], isLoading };
}

// ─── Хук создания складского движения ────────────────────────────────────────

export interface CreateMovementPayload {
  movementType: WarehouseMovementType;
  movementDate: string;
  notes?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
}

export function useCreateMovement(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: CreateMovementPayload) => {
      const res = await fetch(`/api/projects/${objectId}/warehouse-movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания движения');
      return json.data as MovementListItem;
    },
    onSuccess: () => {
      // Инвалидируем все варианты кэша движений для данного объекта
      qc.invalidateQueries({ queryKey: ['warehouse-movements', objectId] });
      toast({ title: 'Движение создано' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
