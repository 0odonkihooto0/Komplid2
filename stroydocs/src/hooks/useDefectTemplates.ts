'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface DefectTemplateItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  normativeRef: string | null;
  requirements: string | null;
  isSystem: boolean;
  organizationId: string | null;
}

interface TemplatesResponse {
  data: DefectTemplateItem[];
  total: number;
  page: number;
  limit: number;
}

export function useDefectTemplates(search: string, enabled: boolean) {
  return useQuery<TemplatesResponse>({
    queryKey: ['defect-templates', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/sk/defect-templates?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки шаблонов');
      return json.data as TemplatesResponse;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDefectTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      category: string;
      normativeRef?: string;
      requirements?: string;
    }) => {
      const res = await fetch('/api/sk/defect-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания шаблона');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defect-templates'] });
    },
  });
}

export function useDeleteDefectTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sk/defect-templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления шаблона');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defect-templates'] });
    },
  });
}
