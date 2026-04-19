'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { PIRClosureStatus } from '@prisma/client';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

interface ClosureAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PIRClosureActItem {
  id: string;
  number: string;
  status: PIRClosureStatus;
  periodStart: string;
  periodEnd: string;
  contractorOrgId: string | null;
  customerOrgId: string | null;
  totalAmount: number | null;
  createdAt: string;
  author: ClosureAuthor;
  _count: { items: number };
}

interface ApiListResponse {
  data: PIRClosureActItem[];
  total: number;
  page: number;
  limit: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface CreatePIRClosurePayload {
  periodStart: string;
  periodEnd: string;
  contractorOrgId?: string;
  customerOrgId?: string;
  totalAmount?: number;
}

// ─────────────────────────────────────────────
// Хук списка актов закрытия ПИР
// ─────────────────────────────────────────────

export function usePIRClosureActs(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/pir-closure`;

  const { data, isLoading, isError } = useQuery<ApiListResponse>({
    queryKey: ['pir-closure-acts', projectId],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}?limit=50`);
      if (!res.ok) throw new Error('Ошибка загрузки актов закрытия ПИР');
      const json: ApiResponse<ApiListResponse> = await res.json();
      return json.data;
    },
    enabled: !!projectId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['pir-closure-acts', projectId] });

  const createMutation = useMutation({
    mutationFn: async (payload: CreatePIRClosurePayload) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err: { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка создания акта закрытия');
      }
      const json: ApiResponse<PIRClosureActItem> = await res.json();
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Акт закрытия создан' });
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    acts: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    createMutation,
  };
}
