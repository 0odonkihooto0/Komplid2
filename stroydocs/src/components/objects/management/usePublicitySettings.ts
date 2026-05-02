'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

interface PortalTokenData {
  token: string | null;
  publicUrl: string | null;
  allowIndexing: boolean;
  viewCount: number;
  customSettings: {
    hideCosts: boolean;
    hideAddress: boolean;
    hideDefects: boolean;
    hidePhotoIds: string[];
  } | null;
}

interface PublicityPayload {
  enabled: boolean;
  hideCosts?: boolean;
  hideAddress?: boolean;
  hideDefects?: boolean;
  expiresInDays?: number | null;
  allowIndexing?: boolean;
}

async function fetchPortalToken(objectId: string): Promise<PortalTokenData> {
  const res = await fetch(`/api/projects/${objectId}/portal-token`);
  if (!res.ok) throw new Error('Ошибка загрузки настроек публичности');
  const json = await res.json();
  if (!json.success) return { token: null, publicUrl: null, allowIndexing: false, viewCount: 0, customSettings: null };
  const t = json.data;
  return {
    token: t?.token ?? null,
    publicUrl: t?.token ? `${window.location.origin}/portal/${t.token}` : null,
    allowIndexing: t?.allowIndexing ?? false,
    viewCount: t?.viewCount ?? 0,
    customSettings: t?.customSettings ?? null,
  };
}

export function usePublicitySettings(objectId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['portal-token', objectId],
    queryFn: () => fetchPortalToken(objectId),
  });

  const mutation = useMutation({
    mutationFn: async (payload: PublicityPayload) => {
      const res = await fetch(`/api/projects/${objectId}/publicity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка сохранения');
      return json.data ?? json;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portal-token', objectId] });
      toast({ title: 'Настройки публичности сохранены' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return { ...query, save: mutation.mutate, isSaving: mutation.isPending };
}
