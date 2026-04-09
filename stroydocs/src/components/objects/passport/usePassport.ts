'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProjectStatus } from '@prisma/client';
import { toast } from '@/hooks/useToast';

// Расширенный тип объекта с паспортными полями (Модуль 2)
export interface PassportProject {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  generalContractor: string | null;
  customer: string | null;
  status: ProjectStatus;
  createdAt: string;
  _count: { contracts: number };
  // Паспортные поля
  cadastralNumber: string | null;
  area: number | null;
  floors: number | null;
  responsibilityClass: string | null;
  permitNumber: string | null;
  permitDate: string | null;
  permitAuthority: string | null;
  designOrg: string | null;
  chiefEngineer: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  // Расширенные реквизиты
  constructionType: string | null;
  region: string | null;
  stroyka: string | null;
  latitude: number | null;
  longitude: number | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  fillDatesFromGpr: boolean;
}

export interface PassportUpdateData {
  name?: string;
  address?: string | null;
  generalContractor?: string | null;
  customer?: string | null;
  cadastralNumber?: string | null;
  area?: number | null;
  floors?: number | null;
  responsibilityClass?: string | null;
  permitNumber?: string | null;
  permitDate?: string | null;
  permitAuthority?: string | null;
  designOrg?: string | null;
  chiefEngineer?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  constructionType?: string | null;
  region?: string | null;
  stroyka?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  fillDatesFromGpr?: boolean;
}

export function usePassport(projectId: string) {
  const queryClient = useQueryClient();

  // queryKey ['project', projectId] — тот же что у useProject → общий кэш TanStack Query
  const { data: project, isLoading } = useQuery<PassportProject>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${projectId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PassportUpdateData) => {
      const res = await fetch(`/api/objects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as PassportProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({ title: 'Сохранено', description: 'Данные паспорта обновлены' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить изменения',
      });
    },
  });

  return { project, isLoading, updateMutation };
}
