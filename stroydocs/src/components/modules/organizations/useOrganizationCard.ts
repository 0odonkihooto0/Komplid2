'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { UpdateOrganizationInput } from '@/lib/validations/organization';

interface Organization {
  id: string;
  name: string;
  inn: string;
  ogrn: string | null;
  sroName: string | null;
  sroNumber: string | null;
  sroInn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export function useOrganizationCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: organization, isLoading } = useQuery<Organization>({
    queryKey: ['organization'],
    queryFn: async () => {
      const res = await fetch('/api/organizations');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateOrganizationInput) => {
      const res = await fetch('/api/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast({ title: 'Данные организации обновлены' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { organization, isLoading, updateMutation };
}
