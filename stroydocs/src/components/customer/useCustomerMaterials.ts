'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Материал в рамках ремонтного проекта заказчика
export interface CustomerMaterial {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  priceRub: number;
  totalRub: number;
  supplier?: string | null;
}

interface CreateMaterialData {
  name: string;
  unit: string;
  quantity: number;
  priceRub: number;
  supplier?: string;
}

// Хук для загрузки и создания материалов по проекту заказчика
export function useCustomerMaterials(projectId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['customer-materials', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/customer/projects/${projectId}/materials`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { materials: CustomerMaterial[]; total: number };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateMaterialData) => {
      const res = await fetch(`/api/customer/projects/${projectId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-materials', projectId] });
    },
  });

  return {
    materials: query.data?.materials ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
