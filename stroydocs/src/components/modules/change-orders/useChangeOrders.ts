'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export type ChangeOrderStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';

export interface ChangeOrderItem {
  id: string;
  number: string;
  title: string;
  description: string | null;
  amount: number;
  status: ChangeOrderStatus;
  contractId: string;
  createdById: string;
  createdBy: { firstName: string; lastName: string };
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

function base(projectId: string, contractId: string) {
  return `/api/objects/${projectId}/contracts/${contractId}/change-orders`;
}

export function useChangeOrders(projectId: string, contractId: string) {
  return useQuery<ChangeOrderItem[]>({
    queryKey: ['change-orders', contractId],
    queryFn: async () => {
      const res = await fetch(base(projectId, contractId));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!projectId && !!contractId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateChangeOrder(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      number: string;
      title: string;
      description?: string;
      amount: number;
    }) => {
      const res = await fetch(base(projectId, contractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания доп. соглашения');
      return json.data as ChangeOrderItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-orders', contractId] });
      toast({ title: 'Доп. соглашение создано' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateChangeOrderStatus(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: ChangeOrderStatus }) => {
      const res = await fetch(`${base(projectId, contractId)}/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления статуса');
      return json.data as ChangeOrderItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-orders', contractId] });
      toast({ title: 'Статус обновлён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
