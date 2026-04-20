'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ProjectIndicator {
  id: string;
  groupName: string;
  indicatorName: string;
  value: string | null;
  comment: string | null;
  maxValue: string | null;
  fileKeys: string[];
  sourceType: 'MANUAL' | 'AUTO';
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PirContract {
  id: string;
  name: string;
  totalAmount: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface TechnicalConditionSummary {
  id: string;
  type: string;
  connectionAvailability: boolean;
  issuingAuthority: string | null;
  expirationDate: string | null;
  number: string | null;
}

export interface ProjectIndicatorsData {
  groups: Record<string, ProjectIndicator[]>;
  pirContracts: PirContract[];
  technicalConditions: TechnicalConditionSummary[];
}

export interface IndicatorFormData {
  groupName: string;
  indicatorName: string;
  value?: string;
  comment?: string;
  maxValue?: string;
  fileKeys?: string[];
}

export function useProjectIndicators(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['project-indicators', projectId];

  const { data, isLoading } = useQuery<ProjectIndicatorsData>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/project-indicators`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: IndicatorFormData) => {
      const res = await fetch(`/api/projects/${projectId}/project-indicators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['counts', 'object', projectId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<IndicatorFormData> }) => {
      const res = await fetch(`/api/projects/${projectId}/project-indicators/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/project-indicators/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['counts', 'object', projectId] });
    },
  });

  return {
    data,
    isLoading,
    createIndicator: createMutation.mutate,
    updateIndicator: updateMutation.mutate,
    deleteIndicator: deleteMutation.mutate,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
