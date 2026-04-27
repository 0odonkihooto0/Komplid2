'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface FeatureFlagItem {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  rolloutPercent: number;
  audiences: {
    workspaceIds?: string[];
    userIds?: string[];
    intents?: string[];
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  success: boolean;
  data: FeatureFlagItem[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface SingleResponse {
  success: boolean;
  data: FeatureFlagItem;
}

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Ошибка API');
  return json;
}

export function useAdminFeatureFlags(params: { search?: string; skip?: number; take?: number } = {}) {
  const { search = '', skip = 0, take = 50 } = params;
  return useQuery<ListResponse>({
    queryKey: ['admin-feature-flags', search, skip, take],
    queryFn: () =>
      apiFetch(
        `/api/admin/feature-flags?search=${encodeURIComponent(search)}&skip=${skip}&take=${take}`
      ),
    staleTime: 30_000,
  });
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiFetch(`/api/admin/feature-flags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      }) as Promise<SingleResponse>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<FeatureFlagItem, 'description' | 'enabled' | 'rolloutPercent' | 'audiences'>>;
    }) =>
      apiFetch(`/api/admin/feature-flags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }) as Promise<SingleResponse>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  });
}

export function useCreateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      key: string;
      description?: string;
      enabled?: boolean;
      rolloutPercent?: number;
    }) =>
      apiFetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }) as Promise<SingleResponse>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  });
}

export function useDeleteFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/feature-flags/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  });
}
