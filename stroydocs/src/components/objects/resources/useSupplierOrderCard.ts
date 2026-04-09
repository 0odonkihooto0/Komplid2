'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type SupplierOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface SupplierOrderItemData {
  id: string;
  quantity: number;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  nomenclatureId: string | null;
  nomenclature: { id: string; name: string; unit: string | null } | null;
}

export interface WarehouseMovementRef {
  id: string;
  number: string;
  movementType: string;
  status: string;
  movementDate: string | null;
}

export interface SupplierOrderCardData {
  id: string;
  number: string;
  status: SupplierOrderStatus;
  totalAmount: number | null;
  deliveryDate: string | null;
  notes: string | null;
  supplierOrgId: string | null;
  customerOrgId: string | null;
  warehouseId: string | null;
  createdAt: string;
  updatedAt: string;
  items: SupplierOrderItemData[];
  movements: WarehouseMovementRef[];
  supplierOrg: { id: string; name: string } | null;
  customerOrg: { id: string; name: string } | null;
  createdBy: { id: string; firstName: string; lastName: string } | null;
}

export interface WarehouseOption {
  id: string;
  name: string;
  location: string | null;
  isDefault: boolean;
}

// ─── Метки статусов ──────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<SupplierOrderStatus, string> = {
  DRAFT: 'Черновик',
  SENT: 'Отправлен',
  CONFIRMED: 'Подтверждён',
  DELIVERED: 'Доставлен',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
};

export const ORDER_STATUS_VARIANTS: Record<
  SupplierOrderStatus,
  'secondary' | 'default' | 'outline' | 'destructive'
> = {
  DRAFT: 'secondary',
  SENT: 'default',
  CONFIRMED: 'default',
  DELIVERED: 'outline',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};

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
    mutationFn: async (body: Partial<{
      supplierOrgId: string | null;
      warehouseId: string | null;
      deliveryDate: string | null;
      notes: string | null;
    }>) => {
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

// ─── Хук «Провести» заказ (DRAFT → SENT) ─────────────────────────────────────

export function useConduct(objectId: string, orderId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/supplier-orders/${orderId}/conduct`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка проведения заказа');
      return json.data as SupplierOrderCardData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-order', objectId, orderId] });
      qc.invalidateQueries({ queryKey: ['supplier-orders', objectId] });
      toast({ title: 'Заказ отправлен поставщику' });
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
      // Переходим на вкладку Склад
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
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: Partial<{
        quantity: number;
        unit: string | null;
        unitPrice: number | null;
      }>;
    }) => {
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
