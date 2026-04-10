'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ContractObligation {
  id: string;
  description: string;
  amount: number | null;
  deadline: string | null;
  status: string;
  contractId: string;
  createdAt: string;
  updatedAt: string;
}

interface ObligationInput {
  description: string;
  amount?: number;
  deadline?: string;
  status?: string;
}

const BASE_URL = (projectId: string, contractId: string) =>
  `/api/projects/${projectId}/contracts/${contractId}/obligations`;

export function useObligations(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['obligations', projectId, contractId];

  const { data, isLoading } = useQuery<ContractObligation[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(BASE_URL(projectId, contractId));
      if (!res.ok) throw new Error('Ошибка загрузки обязательств');
      const json = await res.json();
      return json.data;
    },
  });

  // Создание нового обязательства
  const createMutation = useMutation({
    mutationFn: async (input: ObligationInput) => {
      const res = await fetch(BASE_URL(projectId, contractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Ошибка создания обязательства');
      const json = await res.json();
      return json.data as ContractObligation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Обновление существующего обязательства
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: ObligationInput & { id: string }) => {
      const res = await fetch(`${BASE_URL(projectId, contractId)}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Ошибка обновления обязательства');
      const json = await res.json();
      return json.data as ContractObligation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Удаление обязательства
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE_URL(projectId, contractId)}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Ошибка удаления обязательства');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    obligations: data ?? [],
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
