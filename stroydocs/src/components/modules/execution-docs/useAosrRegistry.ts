'use client';

import { useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { AosrRegistryRow, AosrRegistryContext, AosrRegistryResponse } from '@/types/aosr-registry';

export function useAosrRegistry(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const queryKey = ['aosr-registry', contractId];

  const { data, isLoading } = useQuery<AosrRegistryResponse>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(
        `/api/objects/${projectId}/contracts/${contractId}/aosr-registry`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ docId, field, value }: { docId: string; field: string; value: string }) => {
      const res = await fetch(
        `/api/objects/${projectId}/contracts/${contractId}/aosr-registry/${docId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, value }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as AosrRegistryRow;
    },
    onMutate: async ({ docId, field, value }) => {
      // Отменяем текущие запросы чтобы они не перезатёрли оптимистичное обновление
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AosrRegistryResponse>(queryKey);

      queryClient.setQueryData<AosrRegistryResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          rows: old.rows.map((r) =>
            r.id === docId
              ? { ...r, [field]: value, overrides: { ...r.overrides, [field]: value } }
              : r
          ),
        };
      });

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      // Откат при ошибке
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({ title: 'Ошибка сохранения', description: error.message, variant: 'destructive' });
    },
    onSuccess: (updatedRow) => {
      // Обновляем конкретную строку данными с сервера
      queryClient.setQueryData<AosrRegistryResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          rows: old.rows.map((r) => (r.id === updatedRow.id ? updatedRow : r)),
        };
      });
    },
  });

  // Обёртка с debounce 500мс
  const updateCell = useCallback(
    (docId: string, field: string, value: string) => {
      const key = `${docId}-${field}`;
      const existing = debounceTimers.current.get(key);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        debounceTimers.current.delete(key);
        patchMutation.mutate({ docId, field, value });
      }, 500);

      debounceTimers.current.set(key, timer);
    },
    [patchMutation]
  );

  // Сброс поля к DB-значению (отправляем пустую строку)
  const resetField = useCallback(
    (docId: string, field: string) => {
      patchMutation.mutate({ docId, field, value: '' });
    },
    [patchMutation]
  );

  const rows: AosrRegistryRow[] = data?.rows ?? [];
  const schemas: string[] = data?.schemas ?? [];
  const projectContext: AosrRegistryContext | undefined = data?.projectContext;

  return { rows, schemas, projectContext, isLoading, updateCell, resetField };
}
