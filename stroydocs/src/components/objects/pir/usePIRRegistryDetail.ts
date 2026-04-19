'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ExpertiseStatus, DesignDocType } from '@prisma/client';

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

export interface PIRRegistryDocItem {
  id: string;
  order: number;
  doc: {
    id: string;
    number: string;
    name: string;
    docType: DesignDocType;
  };
}

export interface PIRRegistryDetail {
  id: string;
  number: string;
  createdAt: string;
  notes: string | null;
  senderOrg: RegistryOrg | null;
  receiverOrg: RegistryOrg | null;
  senderPerson: RegistryUser | null;
  receiverPerson: RegistryUser | null;
  expertiseStatus: ExpertiseStatus | null;
  expertiseDate: string | null;
  expertiseComment: string | null;
  items: PIRRegistryDocItem[];
  _count: { items: number };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface UpdateExpertisePayload {
  expertiseStatus: ExpertiseStatus | null;
  expertiseDate: string | null;
  expertiseComment: string | null;
}

// ─────────────────────────────────────────────
// Хук для детальной карточки реестра ПИР
// ─────────────────────────────────────────────

export function usePIRRegistryDetail(projectId: string, regId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/pir-registries/${regId}`;

  const { data: registry, isLoading, isError } = useQuery<PIRRegistryDetail>({
    queryKey: ['pir-registry', regId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки реестра');
      const json: ApiResponse<PIRRegistryDetail> = await res.json();
      return json.data;
    },
    enabled: !!projectId && !!regId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['pir-registry', regId] });

  // Добавление документа в реестр
  const addDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addDoc', docId }),
      });
      if (!res.ok) {
        const err: ApiResponse<null> & { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка добавления документа');
      }
    },
    onSuccess: () => {
      toast({ title: 'Документ добавлен в реестр' });
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: err.message, variant: 'destructive' }),
  });

  // Удаление документа из реестра
  const removeDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeDoc', docId }),
      });
      if (!res.ok) {
        const err: ApiResponse<null> & { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка удаления документа');
      }
    },
    onSuccess: () => {
      toast({ title: 'Документ удалён из реестра' });
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: err.message, variant: 'destructive' }),
  });

  // Обновление данных экспертизы
  const updateExpertiseMutation = useMutation({
    mutationFn: async (payload: UpdateExpertisePayload) => {
      const res = await fetch(`${baseUrl}/expertise`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err: ApiResponse<null> & { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка сохранения экспертизы');
      }
    },
    onSuccess: () => {
      toast({ title: 'Экспертиза обновлена' });
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    registry,
    isLoading,
    isError,
    addDocMutation,
    removeDocMutation,
    updateExpertiseMutation,
  };
}
