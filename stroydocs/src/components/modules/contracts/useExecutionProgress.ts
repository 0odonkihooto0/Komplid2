'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface ContractExecution {
  id: string;
  date: string;
  completionPercent: number | null;
  workersCount: number | null;
  equipmentCount: number | null;
  notes: string | null;
  contractId: string;
  createdAt: string;
}

function base(projectId: string, contractId: string) {
  return `/api/objects/${projectId}/contracts/${contractId}/execution-progress`;
}

export function useExecutionProgress(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: records = [], isLoading } = useQuery<ContractExecution[]>({
    queryKey: ['execution-progress', contractId],
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
      date: string;
      completionPercent?: number;
      workersCount?: number;
      equipmentCount?: number;
      notes?: string;
    }) => {
      const res = await fetch(base(projectId, contractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания записи');
      return json.data as ContractExecution;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['execution-progress', contractId] });
      toast({ title: 'Запись добавлена' });
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
      qc.invalidateQueries({ queryKey: ['execution-progress', contractId] });
      toast({ title: 'Запись удалена' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return { records, isLoading, createMutation, deleteMutation };
}
