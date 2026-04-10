'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface ContractAdvance {
  id: string;
  number: string | null;
  date: string;
  amount: number;
  description: string | null;
  budgetType: string | null;
  contractId: string;
  createdAt: string;
}

function base(projectId: string, contractId: string) {
  return `/api/objects/${projectId}/contracts/${contractId}/advances`;
}

export function useAdvances(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: advances = [], isLoading } = useQuery<ContractAdvance[]>({
    queryKey: ['advances', contractId],
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
    mutationFn: async (data: Omit<ContractAdvance, 'id' | 'contractId' | 'createdAt'>) => {
      const res = await fetch(base(projectId, contractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания аванса');
      return json.data as ContractAdvance;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advances', contractId] });
      toast({ title: 'Аванс добавлен' });
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
      qc.invalidateQueries({ queryKey: ['advances', contractId] });
      toast({ title: 'Аванс удалён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return { advances, isLoading, createMutation, deleteMutation };
}
