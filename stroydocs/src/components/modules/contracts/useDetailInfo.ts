'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface ContractDetailInfo {
  id: string;
  fieldName: string;
  fieldValue: string | null;
  contractId: string;
  createdAt: string;
}

interface CreateDetailInfoInput {
  fieldName: string;
  fieldValue?: string;
}

interface UpdateDetailInfoInput {
  fieldName?: string;
  fieldValue?: string;
}

export function useDetailInfo(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['detail-info', projectId, contractId];

  const { data: items = [], isLoading, isError } = useQuery<ContractDetailInfo[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/detail-info`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  /** Создать новую запись дополнительных сведений */
  const createMutation = useMutation({
    mutationFn: async (data: CreateDetailInfoInput) => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/detail-info`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Запись добавлена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  /** Обновить запись дополнительных сведений */
  const updateMutation = useMutation({
    mutationFn: async ({ infoId, data }: { infoId: string; data: UpdateDetailInfoInput }) => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/detail-info/${infoId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Запись обновлена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  /** Удалить запись дополнительных сведений */
  const deleteMutation = useMutation({
    mutationFn: async (infoId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/detail-info/${infoId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Запись удалена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { items, isLoading, isError, createMutation, updateMutation, deleteMutation };
}
