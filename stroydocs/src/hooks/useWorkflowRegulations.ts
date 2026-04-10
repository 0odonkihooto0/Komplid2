import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface RegulationStep {
  role: 'DEVELOPER' | 'CONTRACTOR' | 'SUPERVISION' | 'SUBCONTRACTOR';
  userId?: string;
}

export interface WorkflowRegulation {
  id: string;
  name: string;
  description?: string | null;
  stepsTemplate: RegulationStep[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

interface CreateRegulationInput {
  name: string;
  description?: string;
  stepsTemplate: RegulationStep[];
}

/** Список регламентов организации */
export function useWorkflowRegulations(orgId: string | undefined) {
  return useQuery<WorkflowRegulation[]>({
    queryKey: ['workflow-regulations', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/workflow-regulations?limit=50`);
      if (!res.ok) throw new Error('Ошибка загрузки регламентов');
      const json = (await res.json()) as ApiResponse<WorkflowRegulation[]>;
      return json.data;
    },
    enabled: !!orgId,
  });
}

/** Создание регламента (только ADMIN) */
export function useCreateRegulation(orgId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRegulationInput) => {
      const res = await fetch(`/api/organizations/${orgId}/workflow-regulations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Ошибка создания регламента');
      }
      return res.json() as Promise<ApiResponse<WorkflowRegulation>>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-regulations', orgId] });
    },
  });
}

/** Удаление регламента (только ADMIN, нельзя удалить при активных ДО) */
export function useDeleteRegulation(orgId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (regulationId: string) => {
      const res = await fetch(
        `/api/organizations/${orgId}/workflow-regulations/${regulationId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Ошибка удаления регламента');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-regulations', orgId] });
    },
  });
}
