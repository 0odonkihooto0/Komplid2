'use client';

import { useQuery } from '@tanstack/react-query';

interface FlagsResponse {
  success: boolean;
  data: { flags: Record<string, boolean> };
}

// Хук для проверки одного feature-flag.
// Для batch-проверки нескольких флагов используй useFeatureFlags (ниже).
export function useFeatureFlag(key: string): { enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery<FlagsResponse>({
    queryKey: ['feature-flag', key],
    queryFn: async () => {
      const res = await fetch(`/api/feature-flags?keys=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error('Ошибка загрузки feature-flags');
      return res.json();
    },
    staleTime: 60_000,
    gcTime: 120_000,
  });

  if (isLoading || !data?.success) return { enabled: false, isLoading: true };
  return { enabled: data.data.flags[key] ?? false, isLoading: false };
}

// Batch-хук для проверки нескольких флагов за один запрос.
export function useFeatureFlags(keys: string[]): { flags: Record<string, boolean>; isLoading: boolean } {
  const keysStr = keys.slice().sort().join(',');
  const { data, isLoading } = useQuery<FlagsResponse>({
    queryKey: ['feature-flags', keysStr],
    queryFn: async () => {
      const res = await fetch(`/api/feature-flags?keys=${encodeURIComponent(keysStr)}`);
      if (!res.ok) throw new Error('Ошибка загрузки feature-flags');
      return res.json();
    },
    enabled: keys.length > 0,
    staleTime: 60_000,
    gcTime: 120_000,
  });

  if (isLoading || !data?.success) {
    return { flags: Object.fromEntries(keys.map((k) => [k, false])), isLoading: true };
  }
  return { flags: data.data.flags, isLoading: false };
}
