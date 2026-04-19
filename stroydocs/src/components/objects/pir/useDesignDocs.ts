'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { DesignDocType, DesignDocStatus } from '@prisma/client';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

interface DocUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface DocOrg {
  id: string;
  name: string;
}

export interface DesignDocItem {
  id: string;
  number: string;
  name: string;
  docType: DesignDocType;
  category: string | null;
  version: number;
  status: DesignDocStatus;
  responsibleOrg: DocOrg | null;
  responsibleUser: DocUser | null;
  author: DocUser;
  _count: { comments: number; versions: number };
  createdAt: string;
  updatedAt: string;
}

interface DesignDocListResponse {
  data: DesignDocItem[];
  total: number;
  page: number;
  limit: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface CreateDesignDocPayload {
  name: string;
  docType: DesignDocType;
  category?: string;
  responsibleOrgId?: string;
  responsibleUserId?: string;
  notes?: string;
  s3Keys?: string[];
  currentS3Key?: string;
}

// ─────────────────────────────────────────────
// Хук для списка документов ПИР
// ─────────────────────────────────────────────

export function useDesignDocs(
  projectId: string,
  docType?: DesignDocType | null,
  category?: string | null,
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/design-docs`;

  const params = new URLSearchParams({ limit: '50' });
  if (docType) params.set('docType', docType);
  if (category) params.set('category', category);

  const { data, isLoading, isError } = useQuery<DesignDocListResponse>({
    queryKey: ['design-docs', projectId, docType ?? 'ALL', category ?? ''],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки документов ПИР');
      const json: ApiResponse<DesignDocListResponse> = await res.json();
      return json.data;
    },
    enabled: !!projectId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['design-docs', projectId] });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateDesignDocPayload) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка создания документа ПИР');
      }
      const json: ApiResponse<DesignDocItem> = await res.json();
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Документ создан' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`${baseUrl}/${docId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка удаления документа');
      }
    },
    onSuccess: () => {
      toast({ title: 'Документ удалён' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  // Создать независимую копию документа (для вкладки «Повторное применение»)
  const copyMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`${baseUrl}/${docId}/copy`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка создания копии документа');
      }
      const json: ApiResponse<DesignDocItem> = await res.json();
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Копия документа создана' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    docs: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    createMutation,
    deleteMutation,
    copyMutation,
  };
}
