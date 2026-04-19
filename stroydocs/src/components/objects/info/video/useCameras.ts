'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export interface VideoCamera {
  id: string;
  cameraNumber: string | null;
  locationName: string | null;
  operationalStatus: string;
  cameraModel: string | null;
  rtspUrl: string | null;
  httpUrl: string;
  failureReason: string | null;
  s3Keys: string[];
  fileNames: string[];
  projectId: string;
  authorId: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateCameraData {
  cameraNumber?: string;
  locationName?: string;
  operationalStatus: 'Работает' | 'Не работает';
  cameraModel?: string;
  rtspUrl?: string;
  httpUrl: string;
  failureReason?: string;
  s3Keys: string[];
  fileNames: string[];
}

export type UpdateCameraData = Partial<CreateCameraData>;

export function useCameras(objectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['cameras', objectId];

  const { data: cameras = [], isLoading } = useQuery<VideoCamera[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/cameras`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as VideoCamera[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateCameraData) => {
      const res = await fetch(`/api/projects/${objectId}/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as VideoCamera;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Камера добавлена', description: 'Запись о камере создана' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCameraData }) => {
      const res = await fetch(`/api/projects/${objectId}/cameras/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as VideoCamera;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Сохранено', description: 'Данные камеры обновлены' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${objectId}/cameras/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Удалено', description: 'Камера удалена' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  return { cameras, isLoading, createMutation, updateMutation, deleteMutation };
}
