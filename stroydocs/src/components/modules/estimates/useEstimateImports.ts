'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface EstimateImportItem {
  id: string;
  sortOrder: number;
  rawName: string;
  rawUnit: string | null;
  volume: number | null;
  price: number | null;
  total: number | null;
  status: string;
  itemType: 'WORK' | 'MATERIAL';
  parentItemId: string | null;
  suggestedKsiNodeId: string | null;
  suggestedKsiNode: { id: string; code: string; name: string } | null;
  workItemId: string | null;
  normativeRefs?: string[];
}

export interface EstimateImport {
  id: string;
  fileName: string;
  fileS3Key: string;
  format: string | null;
  status: string;
  errorMessage: string | null;
  itemsTotal: number;
  itemsMapped: number;
  parsedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string };
  items?: EstimateImportItem[];
  _count?: { items: number };
}

export function apiUrl(projectId: string, contractId: string, path = '') {
  return `/api/projects/${projectId}/contracts/${contractId}/estimates${path}`;
}

/** Хук для работы со списком импортов */
export function useEstimateImports(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: imports = [], isLoading } = useQuery<EstimateImport[]>({
    queryKey: ['estimates', contractId],
    queryFn: async () => {
      const res = await fetch(apiUrl(projectId, contractId));
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (importId: string) => {
      const res = await fetch(apiUrl(projectId, contractId, `/${importId}`), {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates', contractId] });
      toast({ title: 'Импорт удалён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { imports, isLoading, deleteMutation };
}
