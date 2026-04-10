'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import type { CreateTechnicalConditionInput, UpdateTechnicalConditionInput } from '@/lib/validations/technical-condition';

export interface TechnicalCondition {
  id: string;
  type: string;
  connectionAvailability: string | null;
  issueDate: string | null;
  number: string | null;
  expirationDate: string | null;
  issuingAuthority: string | null;
  connectionConditions: string | null;
  projectId: string;
  responsibleOrgId: string | null;
  responsibleOrg: { id: string; name: string } | null;
  landPlotId: string | null;
  landPlot: { id: string; cadastralNumber: string } | null;
  documentS3Key: string | null;
  documentFileName: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useTechnicalConditions(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['technical-conditions', projectId];

  const { data: technicalConditions = [], isLoading } = useQuery<TechnicalCondition[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/technical-conditions`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTechnicalConditionInput) => {
      const res = await fetch(`/api/projects/${projectId}/technical-conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TechnicalCondition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'ТУ добавлено', description: 'Технические условия успешно созданы' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTechnicalConditionInput }) => {
      const res = await fetch(`/api/projects/${projectId}/technical-conditions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TechnicalCondition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Сохранено', description: 'Технические условия обновлены' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/technical-conditions/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Удалено', description: 'Технические условия удалены' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  return { technicalConditions, isLoading, createMutation, updateMutation, deleteMutation };
}
