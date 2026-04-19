'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export type PaymentType = 'PLAN' | 'FACT';

export interface ContractPaymentItem {
  id: string;
  paymentType: PaymentType;
  amount: number;
  paymentDate: string;
  budgetType: string | null;
  limitYear: number | null;
  limitAmount: number | null;
  description: string | null;
  contractId: string;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

function base(projectId: string, contractId: string) {
  return `/api/projects/${projectId}/contracts/${contractId}/payments`;
}

export function usePaymentsTab(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: payments = [], isLoading } = useQuery<ContractPaymentItem[]>({
    queryKey: ['contract-payments', contractId],
    queryFn: async () => {
      const res = await fetch(base(projectId, contractId));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!projectId && !!contractId,
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      paymentType: PaymentType;
      amount: number;
      paymentDate: string;
      budgetType?: string;
      limitYear?: number;
      limitAmount?: number;
      description?: string;
    }) => {
      const res = await fetch(base(projectId, contractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания платежа');
      return json.data as ContractPaymentItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-payments', contractId] });
      toast({ title: 'Платёж добавлен' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await fetch(`${base(projectId, contractId)}/${paymentId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления');
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-payments', contractId] });
      toast({ title: 'Платёж удалён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return { payments, isLoading, createMutation, deleteMutation };
}
