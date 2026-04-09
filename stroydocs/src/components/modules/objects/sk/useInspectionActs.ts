'use client';

import { useQuery } from '@tanstack/react-query';

export interface InspectionActListItem {
  id: string;
  number: string;
  issuedAt: string;
  s3Key: string | null;
  issuedBy: { id: string; firstName: string; lastName: string };
  inspection: {
    id: string;
    number: string;
    status: string;
    inspector: { id: string; firstName: string; lastName: string };
  };
}

/** Хук для получения реестра актов проверки объекта */
export function useInspectionActs(objectId: string) {
  return useQuery<{ data: InspectionActListItem[]; total: number; page: number; limit: number }>({
    queryKey: ['inspection-acts', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/inspection-acts`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки актов проверки');
      return json.data;
    },
    enabled: !!objectId,
  });
}
