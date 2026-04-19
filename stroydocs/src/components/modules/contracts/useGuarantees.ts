'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface ContractGuarantee {
  id: string;
  amount: number;
  percentage: number | null;
  retentionDate: string | null;
  releaseDate: string | null;
  status: string;
  description: string | null;
  contractId: string;
  createdAt: string;
}

function base(projectId: string, contractId: string) {
  return `/api/projects/${projectId}/contracts/${contractId}/guarantees`;
}

export function useGuarantees(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: guarantees = [], isLoading } = useQuery<ContractGuarantee[]>({
    queryKey: ['guarantees', contractId],
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
      amount: number;
      percentage?: number;
      retentionDate?: string;
      releaseDate?: string;
      status?: string;
      description?: string;
    }) => {
      const res = await fetch(base(projectId, contractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания гарантийного удержания');
      return json.data as ContractGuarantee;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guarantees', contractId] });
      toast({ title: 'Гарантийное удержание добавлено' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${base(projectId, contractId)}/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления');
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guarantees', contractId] });
      toast({ title: 'Гарантийное удержание удалено' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return { guarantees, isLoading, createMutation, deleteMutation };
}
