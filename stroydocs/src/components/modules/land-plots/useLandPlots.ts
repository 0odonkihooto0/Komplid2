'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import type { CreateLandPlotInput, UpdateLandPlotInput } from '@/lib/validations/land-plot';

export interface LandPlot {
  id: string;
  cadastralNumber: string;
  address: string | null;
  area: number | null;
  landCategory: string | null;
  permittedUse: string | null;
  cadastralValue: number | null;
  status: string | null;
  ownershipForm: string | null;
  hasEncumbrances: boolean;
  encumbranceInfo: string | null;
  hasRestrictions: boolean;
  restrictionInfo: string | null;
  hasDemolitionObjects: boolean;
  demolitionInfo: string | null;
  inspectionDate: string | null;
  egrnNumber: string | null;
  gpzuNumber: string | null;
  gpzuDate: string | null;
  gpzuS3Key: string | null;
  projectId: string;
  ownerOrgId: string | null;
  ownerOrg: { id: string; name: string } | null;
  tenantOrgId: string | null;
  tenantOrg: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export function useLandPlots(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['land-plots', projectId];

  const { data: landPlots = [], isLoading } = useQuery<LandPlot[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/land-plots`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateLandPlotInput) => {
      const res = await fetch(`/api/projects/${projectId}/land-plots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as LandPlot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Участок добавлен', description: 'Земельный участок успешно создан' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLandPlotInput }) => {
      const res = await fetch(`/api/projects/${projectId}/land-plots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as LandPlot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Сохранено', description: 'Земельный участок обновлён' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/land-plots/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Удалено', description: 'Земельный участок удалён' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  return { landPlots, isLoading, createMutation, updateMutation, deleteMutation };
}
