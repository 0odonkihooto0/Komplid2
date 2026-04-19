'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ExpertiseStatus } from '@prisma/client';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

interface RegistryOrg {
  id: string;
  name: string;
}

interface RegistryUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PIRRegistryItem {
  id: string;
  number: string;
  createdAt: string;
  senderOrg: RegistryOrg | null;
  receiverOrg: RegistryOrg | null;
  senderPerson: RegistryUser | null;
  receiverPerson: RegistryUser | null;
  expertiseStatus: ExpertiseStatus | null;
  _count: { items: number };
}

interface PIRRegistryListResponse {
  data: PIRRegistryItem[];
  total: number;
  page: number;
  limit: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface CreatePIRRegistryPayload {
  senderOrgId?: string;
  receiverOrgId?: string;
  senderPersonId?: string;
  receiverPersonId?: string;
  notes?: string;
}

// ─────────────────────────────────────────────
// Хук для списка реестров ПИР
// ─────────────────────────────────────────────

export function usePIRRegistries(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/pir-registries`;

  const { data, isLoading, isError } = useQuery<PIRRegistryListResponse>({
    queryKey: ['pir-registries', projectId],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}?limit=50`);
      if (!res.ok) throw new Error('Ошибка загрузки реестров ПИР');
      const json: ApiResponse<PIRRegistryListResponse> = await res.json();
      return json.data;
    },
    enabled: !!projectId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['pir-registries', projectId] });

  const createMutation = useMutation({
    mutationFn: async (payload: CreatePIRRegistryPayload) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err: ApiResponse<null> & { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка создания реестра');
      }
      const json: ApiResponse<PIRRegistryItem> = await res.json();
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Реестр создан' });
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    registries: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    createMutation,
  };
}
