'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PhotoEntityType, PhotoCategory } from '@prisma/client';
import { useToast } from '@/hooks/useToast';

export interface PhotoItem {
  id: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  size: number;
  entityType: PhotoEntityType;
  entityId: string;
  gpsLat: number | null;
  gpsLng: number | null;
  takenAt: string | null;
  annotations: unknown | null;
  category: PhotoCategory | null;
  downloadUrl: string;
  author: { id: string; firstName: string; lastName: string };
  createdAt: string;
  workItemName?: string | null;
}

export function usePhotos(entityType?: string, entityId?: string, category?: string, contractId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams();
  if (contractId) {
    queryParams.set('contractId', contractId);
  } else {
    if (entityType) queryParams.set('entityType', entityType);
    if (entityId) queryParams.set('entityId', entityId);
  }

  const { data: photos = [], isLoading } = useQuery<PhotoItem[]>({
    queryKey: ['photos', contractId ?? entityType, contractId ? 'contract' : entityId],
    queryFn: async () => {
      const res = await fetch(`/api/photos?${queryParams.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Фильтрация по категории на клиенте
  const filteredPhotos = category
    ? photos.filter((p) => p.category === category)
    : photos;

  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      toast({ title: 'Фото удалено' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { photos: filteredPhotos, allPhotos: photos, isLoading, deletePhoto: deleteMutation.mutate };
}
