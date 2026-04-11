'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export interface PlannerVersion {
  id: string;
  name: string;
  isCurrent: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  _count: { tasks: number };
}

export function usePlannerVersions(projectId: string) {
  const { data: versions = [], isLoading } = useQuery<PlannerVersion[]>({
    queryKey: ['planner-versions', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${projectId}/planner-versions`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return { versions, isLoading };
}

export function useCreatePlannerVersion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch(`/api/objects/${projectId}/planner-versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as PlannerVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-versions', projectId] });
      toast({ title: 'Версия создана' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });
}

export function useUpdatePlannerVersion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ versionId, ...data }: { versionId: string; name?: string; isCurrent?: boolean }) => {
      const res = await fetch(`/api/objects/${projectId}/planner-versions/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as PlannerVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-versions', projectId] });
      toast({ title: 'Версия обновлена' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });
}

export function useDeletePlannerVersion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(`/api/objects/${projectId}/planner-versions/${versionId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-versions', projectId] });
      toast({ title: 'Версия удалена' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });
}
