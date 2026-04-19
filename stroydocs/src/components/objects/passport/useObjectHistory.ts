'use client';

import { useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '@/types/api';

export interface ObjectHistoryEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  createdAt: string;
  user: { id: string; fullName: string } | null;
}

export function useObjectHistory(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['object-history', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/history`);
      const json: ApiResponse<ObjectHistoryEntry[]> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled,
  });
}
