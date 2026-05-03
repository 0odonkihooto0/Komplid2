'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Платёж в рамках ремонтного проекта заказчика
export interface CustomerPayment {
  id: string;
  category: string;
  amountRub: number;
  date: string;
  description: string;
  isPaid: boolean;
}

interface CreatePaymentData {
  category: string;
  amountRub: number;
  date: string;
  description: string;
  isPaid?: boolean;
}

// Хук для загрузки и создания оплат по проекту заказчика
export function useCustomerPayments(projectId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['customer-payments', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/customer/projects/${projectId}/payments`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { payments: CustomerPayment[]; total: number };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreatePaymentData) => {
      const res = await fetch(`/api/customer/projects/${projectId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-payments', projectId] });
    },
  });

  return {
    payments: query.data?.payments ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
