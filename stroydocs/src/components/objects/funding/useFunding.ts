'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export type FundingType = 'BUDGET' | 'EXTRA_BUDGET' | 'CREDIT' | 'OWN_FUNDS';

export const FUNDING_TYPE_LABELS: Record<FundingType, string> = {
  BUDGET: 'Бюджетное',
  EXTRA_BUDGET: 'Внебюджетное',
  CREDIT: 'Кредитное',
  OWN_FUNDS: 'Собственные средства',
};

export interface BudgetTypeOption {
  id: string;
  name: string;
  code: string;
  color: string | null;
}

export interface FundingSource {
  id: string;
  type: FundingType;
  budgetTypeId: string | null;
  budgetType: BudgetTypeOption | null;
  name: string;
  amount: number;
  period: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateFundingData {
  type: FundingType;
  budgetTypeId?: string | null;
  name: string;
  amount: number;
  period?: string;
}

export function useFunding(projectId: string) {
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading } = useQuery<FundingSource[]>({
    queryKey: ['funding', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/funding`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFundingData) => {
      const res = await fetch(`/api/projects/${projectId}/funding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as FundingSource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding', projectId] });
      toast({ title: 'Добавлено', description: 'Источник финансирования добавлен' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message || 'Не удалось добавить источник',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/funding/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding', projectId] });
      toast({ title: 'Удалено', description: 'Источник финансирования удалён' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить источник',
      });
    },
  });

  return { sources, isLoading, createMutation, deleteMutation };
}

export function useBudgetTypes() {
  return useQuery<BudgetTypeOption[]>({
    queryKey: ['references', 'budgetTypes'],
    queryFn: async () => {
      const res = await fetch('/api/references/budgetTypes?limit=50');
      const json = await res.json();
      if (!json.success) return [];
      return (json.data?.items ?? json.data) as BudgetTypeOption[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
