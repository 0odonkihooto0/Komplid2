'use client';

import { useQuery } from '@tanstack/react-query';
import { useDefect } from '@/components/modules/defects/useDefects';

interface PhotoItem {
  id: string;
  s3Key: string;
  fileName: string | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string } | null;
}

export function useDefectDetail(objectId: string, defectId: string) {
  return useDefect(objectId, defectId);
}

export function useDefectPhotos(objectId: string, defectId: string) {
  return useQuery<PhotoItem[]>({
    queryKey: ['defect-photos', objectId, defectId],
    queryFn: async () => {
      const params = new URLSearchParams({
        entityType: 'Defect',
        entityId: defectId,
      });
      const res = await fetch(`/api/objects/${objectId}/photos?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки фото');
      return json.data ?? [];
    },
    enabled: !!objectId && !!defectId,
  });
}
