'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import { BUDGET_KEYS, BUDGET_LABELS } from '@/components/objects/funding/useFundingRecords';

export { BUDGET_KEYS, BUDGET_LABELS };

export interface LimitRisk {
  id: string;
  year: number;
  status: string;
  totalAmount: number;
  federalBudget: number;
  regionalBudget: number;
  localBudget: number;
  extraBudget: number;
  ownFunds: number;
  riskReason: string;
  resolutionProposal: string | null;
  completionDate: string | null;
  projectId: string;
  contractId: string | null;
  contract: { id: string; number: string; name: string } | null;
  createdAt: string;
}

export interface CreateLimitRiskData {
  year: number;
  federalBudget: number;
  regionalBudget: number;
  localBudget: number;
  ownFunds: number;
  extraBudget: number;
  riskReason: string;
  resolutionProposal?: string;
  completionDate?: string | null;
  contractId?: string | null;
}

export type UpdateLimitRiskData = Partial<CreateLimitRiskData>;

export function useLimitRisks(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['limit-risks', projectId];

  const { data: risks = [], isLoading } = useQuery<LimitRisk[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/limit-risks`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateLimitRiskData) => {
      const res = await fetch(`/api/projects/${projectId}/limit-risks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as LimitRisk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['counts', 'object', projectId] });
      toast({ title: 'Добавлено', description: 'Риск неосвоения лимита добавлен' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLimitRiskData }) => {
      const res = await fetch(`/api/projects/${projectId}/limit-risks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as LimitRisk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Сохранено', description: 'Риск неосвоения лимита обновлён' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/limit-risks/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['counts', 'object', projectId] });
      toast({ title: 'Удалено', description: 'Риск неосвоения лимита удалён' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  return { risks, isLoading, createMutation, updateMutation, deleteMutation };
}
