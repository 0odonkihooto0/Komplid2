'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import type { SupplierOrderStatus, SupplierOrderCardData } from './useSupplierOrderCard';

// ─── Хук смены статуса заказа ────────────────────────────────────────────────

export function useChangeOrderStatus(objectId: string, orderId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (status: SupplierOrderStatus) => {
      const res = await fetch(`/api/projects/${objectId}/supplier-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка смены статуса');
      return json.data as SupplierOrderCardData;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['supplier-order', objectId, orderId] });
      qc.invalidateQueries({ queryKey: ['supplier-orders', objectId] });
      toast({ title: `Статус изменён на «${data.status}»` });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук удаления заказа ─────────────────────────────────────────────────────

export function useDeleteOrder(objectId: string, orderId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/supplier-orders/${orderId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления заказа');
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-orders', objectId] });
      toast({ title: 'Заказ удалён' });
      router.push(`/objects/${objectId}/resources/procurement`);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук копирования заказа ───────────────────────────────────────────────────

export function useCopyOrder(objectId: string, orderId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      // Копирование через создание нового заказа на основе текущего
      const res = await fetch(`/api/projects/${objectId}/supplier-orders/${orderId}/copy`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка копирования заказа');
      return json.data as { id: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['supplier-orders', objectId] });
      toast({ title: 'Заказ скопирован', description: 'Открываем копию...' });
      router.push(`/objects/${objectId}/resources/procurement/${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук маршрута согласования заказа ────────────────────────────────────────

export function useOrderWorkflow(objectId: string, orderId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['supplier-order', objectId, orderId];

  const startWorkflow = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/supplier-orders/${orderId}/workflow`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка запуска согласования');
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: 'Маршрут согласования запущен' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const stopWorkflow = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/supplier-orders/${orderId}/workflow`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка сброса согласования');
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: 'Маршрут согласования остановлен' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return { startWorkflow, stopWorkflow, queryKey };
}
