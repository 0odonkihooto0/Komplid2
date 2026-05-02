'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { type GuestScope } from '@/types/guest-scope';

interface GuestMe {
  workspaceName: string;
  scope: GuestScope;
  user: { firstName: string; lastName: string; email: string };
}

/**
 * Хук для доступа к данным сессии гостя и его правам доступа.
 * Используется в компонентах гостевого кабинета.
 */
export function useGuestSession() {
  const { data: session } = useSession();

  const { data: me, isLoading } = useQuery<GuestMe>({
    queryKey: ['guest-me'],
    queryFn: async () => {
      const res = await fetch('/api/guest/me');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    // Запрашиваем только при наличии активной сессии
    enabled: !!session,
  });

  const scope = me?.scope ?? null;
  const permissions = scope?.permissions ?? null;

  return {
    isLoading,
    workspaceName: me?.workspaceName ?? '',
    scope,
    permissions,
    // Список идентификаторов проектов, доступных гостю
    allowedProjectIds: scope?.allowedProjectIds ?? [],
    // Отдельные флаги разрешений для удобства использования в компонентах
    canViewPhotos: permissions?.canViewPhotos ?? false,
    canViewDocuments: permissions?.canViewDocuments ?? false,
    canComment: permissions?.canComment ?? false,
    canSignActs: permissions?.canSignActs ?? false,
    canViewCosts: permissions?.canViewCosts ?? false,
  };
}
