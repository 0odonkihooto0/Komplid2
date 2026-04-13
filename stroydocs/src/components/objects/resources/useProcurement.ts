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

export type SupplierOrderType =
  | 'SUPPLIER_ORDER'
  | 'WAREHOUSE_REQUEST'
  | 'SUPPLIER_INQUIRY';

export interface SupplierOrderListItem {
  id: string;
  number: string;
  status: SupplierOrderStatus;
  type: SupplierOrderType;
  totalAmount: number | null;
  deliveryDate: string | null;
  createdAt: string;
  supplierOrg: { name: string } | null;
  _count: { items: number };
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

export const ORDER_STATUS_CLASS: Record<SupplierOrderStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-green-700 text-white',
  COMPLETED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

// ─── Хук загрузки списка заказов ─────────────────────────────────────────────

export function useOrders(
  objectId: string,
  status?: SupplierOrderStatus | '',
  type?: SupplierOrderType
) {
  const { data, isLoading } = useQuery<{ data: SupplierOrderListItem[]; total: number }>({
    queryKey: ['supplier-orders', objectId, status, type],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (status) sp.set('status', status);
      if (type) sp.set('type', type);
      const query = sp.toString() ? `?${sp.toString()}` : '';
      const res = await fetch(`/api/projects/${objectId}/supplier-orders${query}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки заказов');
      return json;
    },
    enabled: !!objectId,
  });
  return { orders: data?.data ?? [], total: data?.total ?? 0, isLoading };
}

// ─── Хук счётчиков документов по типам ───────────────────────────────────────

export type OrderCounts = Record<SupplierOrderType, number>;

export function useOrderCounts(objectId: string) {
  const { data } = useQuery<{ data: OrderCounts }>({
    queryKey: ['supplier-orders-counts', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/supplier-orders/counts`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки счётчиков');
      return json;
    },
    enabled: !!objectId,
  });
  return data?.data ?? { SUPPLIER_ORDER: 0, WAREHOUSE_REQUEST: 0, SUPPLIER_INQUIRY: 0 };
}

// ─── Хук создания заказа поставщику ─────────────────────────────────────────

export function useCreateOrder(objectId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: {
      number?: string;
      type?: SupplierOrderType;
      supplierOrgId?: string;
      warehouseId?: string;
      deliveryDate?: string;
      notes?: string;
    }) => {
      const res = await fetch(`/api/projects/${objectId}/supplier-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания заказа');
      return json.data as SupplierOrderListItem;
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['supplier-orders', objectId] });
      qc.invalidateQueries({ queryKey: ['supplier-orders-counts', objectId] });
      toast({ title: 'Документ создан' });
      // Переходим в карточку заказа
      router.push(`/objects/${objectId}/resources/procurement/${order.id}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук создания заказа из заявки ───────────────────────────────────────────

export function useCreateOrderFromRequest(objectId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const res = await fetch(
        `/api/projects/${objectId}/material-requests/${requestId}/create-order`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания заказа из заявки');
      return json.data;
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['supplier-orders', objectId] });
      qc.invalidateQueries({ queryKey: ['supplier-orders-counts', objectId] });
      toast({ title: 'Заказ создан из заявки' });
      router.push(`/objects/${objectId}/resources/procurement/${order.id}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук загрузки списка заявок (для диалога «Из заявки») ───────────────────

export interface RequestOption {
  id: string;
  number: string;
  status: string;
  _count: { items: number };
}

export function useRequestOptions(objectId: string) {
  const { data, isLoading } = useQuery<{ data: RequestOption[] }>({
    queryKey: ['material-requests-options', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/material-requests?limit=200`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки заявок');
      return json;
    },
    enabled: !!objectId,
  });
  return { requests: data?.data ?? [], isLoading };
}
