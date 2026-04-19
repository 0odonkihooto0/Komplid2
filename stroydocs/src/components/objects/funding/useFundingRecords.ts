'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export type FundingRecordType = 'ALLOCATED' | 'DELIVERED';

export const RECORD_TYPE_LABELS: Record<FundingRecordType, string> = {
  ALLOCATED: 'Выделено',
  DELIVERED: 'Доведено',
};

export interface BudgetBreakdown {
  federalBudget: number;
  regionalBudget: number;
  localBudget: number;
  ownFunds: number;
  extraBudget: number;
}

export const BUDGET_KEYS: (keyof BudgetBreakdown)[] = [
  'federalBudget',
  'regionalBudget',
  'localBudget',
  'ownFunds',
  'extraBudget',
];

export const BUDGET_LABELS: Record<keyof BudgetBreakdown, string> = {
  federalBudget: 'Федеральный бюджет',
  regionalBudget: 'Региональный бюджет',
  localBudget: 'Местный бюджет',
  ownFunds: 'Собственные средства',
  extraBudget: 'Внебюджетные средства',
};

export const BUDGET_COLORS: Record<keyof BudgetBreakdown, string> = {
  federalBudget: '#2563EB',
  regionalBudget: '#16a34a',
  localBudget: '#ca8a04',
  ownFunds: '#9333ea',
  extraBudget: '#ea580c',
};

export interface FundingRecord extends BudgetBreakdown {
  id: string;
  year: number;
  recordType: FundingRecordType;
  totalAmount: number;
  projectId: string;
  createdAt: string;
}

export interface CreateFundingRecordData extends BudgetBreakdown {
  year: number;
  recordType: FundingRecordType;
}

export type UpdateFundingRecordData = Partial<CreateFundingRecordData>;

export function useFundingRecords(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['funding-records', projectId];

  const { data: records = [], isLoading } = useQuery<FundingRecord[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/funding-records`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFundingRecordData) => {
      const res = await fetch(`/api/projects/${projectId}/funding-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as FundingRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Добавлено', description: 'Запись финансирования добавлена' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFundingRecordData }) => {
      const res = await fetch(`/api/projects/${projectId}/funding-records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as FundingRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Сохранено', description: 'Запись финансирования обновлена' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/funding-records/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Удалено', description: 'Запись финансирования удалена' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  return { records, isLoading, createMutation, updateMutation, deleteMutation };
}
