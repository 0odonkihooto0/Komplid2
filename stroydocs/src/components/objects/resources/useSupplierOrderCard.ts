'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import type {
  SupplierOrderCardData,
  SupplierOrderItemData,
  WarehouseOption,
  UpdateOrderBody,
  UpdateItemData,
} from './supplierOrderTypes';

// Реэкспорт типов и констант для обратной совместимости компонентов
export type {
  SupplierOrderStatus,
  DeliveryCondition,
  SupplierOrderItemData,
  ApprovalStepData,
  ApprovalRouteData,
  WarehouseMovementRef,
  SupplierOrderCardData,
  WarehouseOption,
  UpdateOrderBody,
  UpdateItemData,
} from './supplierOrderTypes';
export {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
  DELIVERY_CONDITION_LABELS,
} from './supplierOrderTypes';

// ─── Хук загрузки карточки заказа ────────────────────────────────────────────

export function useOrderCard(objectId: string, orderId: string) {
  const { data, isLoading, error } = useQuery<SupplierOrderCardData>({
    queryKey: ['supplier-order', objectId, orderId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/supplier-orders/${orderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки заказа');
      return json.data as SupplierOrderCardData;
    },
    enabled: !!objectId && !!orderId,
  });
  return { order: data ?? null, isLoading, error };
}

// ─── Хук обновления реквизитов заказа ────────────────────────────────────────

export function useUpdateOrder(objectId: string, orderId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: UpdateOrderBody) => {
      const res = await fetch(`/api/projects/${objectId}/supplier-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления заказа');
      return json.data as SupplierOrderCardData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-order', objectId, orderId] });
      qc.invalidateQueries({ queryKey: ['supplier-orders', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук создания поступления на склад ───────────────────────────────────────

export function useCreateReceipt(objectId: string, orderId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ warehouseId }: { warehouseId: string }) => {
      const res = await fetch(
        `/api/projects/${objectId}/supplier-orders/${orderId}/create-receipt`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ warehouseId }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания поступления');
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-order', objectId, orderId] });
      toast({ title: 'Поступление создано', description: 'Переходим на вкладку склада' });
      router.push(`/objects/${objectId}/resources/warehouse`);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук добавления позиции к заказу ─────────────────────────────────────────

export function useAddOrderItem(objectId: string, orderId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { quantity?: number; unit?: string }) => {
      const res = await fetch(
        `/api/projects/${objectId}/supplier-orders/${orderId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: body.quantity ?? 1, unit: body.unit }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка добавления позиции');
      return json.data as SupplierOrderItemData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-order', objectId, orderId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук обновления позиции заказа ───────────────────────────────────────────

export function useUpdateOrderItem(objectId: string, orderId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateItemData }) => {
      const res = await fetch(
        `/api/projects/${objectId}/supplier-orders/${orderId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления позиции');
      return json.data as SupplierOrderItemData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-order', objectId, orderId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук удаления позиции заказа ─────────────────────────────────────────────

export function useDeleteOrderItem(objectId: string, orderId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(
        `/api/projects/${objectId}/supplier-orders/${orderId}/items/${itemId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления позиции');
      return itemId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-order', objectId, orderId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук загрузки складов (для диалога «Создать поступление») ────────────────

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
