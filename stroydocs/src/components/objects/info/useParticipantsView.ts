'use client';

import { useQuery } from '@tanstack/react-query';
import type { ParticipantRole } from '@prisma/client';

export interface ObjectParticipantItem {
  organization: {
    id: string;
    name: string;
    inn: string;
    sroNumber: string | null;
    sroName: string | null;
  };
  roles: ParticipantRole[];
  contracts: { id: string; number: string; name: string | null }[];
}

export function useParticipantsView(objectId: string) {
  const { data, isLoading, error } = useQuery<ObjectParticipantItem[]>({
    queryKey: ['object-participants', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/participants`);
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json.data;
    },
  });

  return { participants: data ?? [], isLoading, error };
}
