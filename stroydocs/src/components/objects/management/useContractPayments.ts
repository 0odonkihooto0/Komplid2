'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateContractPaymentInput } from '@/lib/validations/contract-payment';

export interface ContractPaymentItem {
  id: string;
  paymentType: 'PLAN' | 'FACT';
  amount: number;
  paymentDate: string;
  budgetType: string | null;
  description: string | null;
  createdBy: { id: string; firstName: string; lastName: string };
}

export function useContractPayments(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['contract-payments', contractId];

  const { data: payments = [], isLoading } = useQuery<ContractPaymentItem[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/contracts/${contractId}/payments`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
    enabled: !!contractId,
  });

  const addMutation = useMutation({
    mutationFn: async (data: CreateContractPaymentInput) => {
      const res = await fetch(`/api/projects/${projectId}/contracts/${contractId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payments/${paymentId}`,
        { method: 'DELETE' },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Итоги план / факт
  const { totalPlan, totalFact } = useMemo(() => {
    let totalPlan = 0;
    let totalFact = 0;
    for (const p of payments) {
      if (p.paymentType === 'PLAN') totalPlan += p.amount;
      else totalFact += p.amount;
    }
    return { totalPlan, totalFact };
  }, [payments]);

  return { payments, isLoading, addMutation, deleteMutation, totalPlan, totalFact };
}
