'use client';

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { syncQueueRepo } from '@/lib/idb/repos/sync-queue-repo';
import { useNetworkStore } from '@/stores/network-store';
import type { SyncQueueItem } from '@/lib/idb/db';

interface OfflineMutationConfig<TData, TVariables> {
  url: string | ((variables: TVariables) => string);
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  entityType: SyncQueueItem['entityType'];
  entityIdFromVars?: (variables: TVariables) => string | undefined;
  getDescription?: (variables: TVariables) => string;
  optimisticUpdate?: (variables: TVariables) => Promise<void> | void;
  onServerSuccess?: (data: TData, variables: TVariables) => Promise<void> | void;
}

export function useOfflineMutation<TData = unknown, TVariables = unknown>(
  config: OfflineMutationConfig<TData, TVariables>,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const isOnline = useNetworkStore.getState().isOnline;
      const url =
        typeof config.url === 'function' ? config.url(variables) : config.url;

      // Оптимистичное обновление в IDB
      await config.optimisticUpdate?.(variables);

      // Если онлайн — пробуем сразу в API
      if (isOnline) {
        try {
          const response = await fetch(url, {
            method: config.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variables),
            credentials: 'include',
          });

          if (response.ok) {
            const data: TData = await response.json();
            await config.onServerSuccess?.(data, variables);
            return data;
          }

          // 4xx (кроме 408, 429) — перманентная ошибка, не ставить в очередь
          if (
            response.status >= 400 &&
            response.status < 500 &&
            ![408, 429].includes(response.status)
          ) {
            throw new Error(`HTTP ${response.status}`);
          }
          // 5xx или 408/429 — fallthrough к очереди
        } catch (error) {
          // Только перманентные HTTP-ошибки пробрасываем наверх
          if (error instanceof Error && error.message.startsWith('HTTP 4')) {
            throw error;
          }
          // Сетевая ошибка — fallthrough к очереди
        }
      }

      // Офлайн или временный сбой — в очередь синхронизации
      await syncQueueRepo.enqueue({
        url,
        method: config.method,
        body: variables,
        entityType: config.entityType,
        entityId: config.entityIdFromVars?.(variables),
        description: config.getDescription?.(variables),
      });

      // Возвращаем null — UI должен учитывать статус «ожидает синхронизации»
      return null as unknown as TData;
    },
    ...options,
  });
}
