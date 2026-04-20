'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { cacheSnapshotsRepo } from '@/lib/idb/repos/cache-snapshots-repo';
import { useNetworkStore } from '@/stores/network-store';

interface OfflineQueryConfig<TData> {
  key: string;
  url: string;
  ttlMs?: number;
}

export function useOfflineQuery<TData = unknown>(
  config: OfflineQueryConfig<TData>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>
) {
  const { key, url, ttlMs = 5 * 60 * 1000 } = config;

  return useQuery<TData, Error>({
    queryKey: ['offline-query', key],
    queryFn: async () => {
      const isOnline = useNetworkStore.getState().isOnline;

      // Если онлайн — пробуем получить свежие данные
      if (isOnline) {
        try {
          const response = await fetch(url, { credentials: 'include' });
          if (response.ok) {
            const data: TData = await response.json();
            await cacheSnapshotsRepo.set(key, data, ttlMs);
            return data;
          }
          // 4xx — пробуем кэш, иначе ошибка
        } catch {
          // Сетевая ошибка — fallthrough к кэшу
        }
      }

      // Офлайн или fetch упал — возвращаем кэш
      const cached = await cacheSnapshotsRepo.get(key);
      if (cached) {
        return cached.data as TData;
      }

      throw new Error('Нет кэшированных данных и сеть недоступна');
    },
    ...options,
  });
}
