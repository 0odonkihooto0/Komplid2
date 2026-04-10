'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export interface ProjectCoordinate {
  id: string;
  latitude: number;
  longitude: number;
  constructionPhase: number | null;
  createdAt: string;
}

export interface CoordinatePayload {
  latitude: number;
  longitude: number;
  constructionPhase?: number | null;
}

export function useCoordinates(projectId: string) {
  const queryClient = useQueryClient();
  const qk = ['coordinates', projectId];

  const { data: coordinates = [], isLoading } = useQuery<ProjectCoordinate[]>({
    queryKey: qk,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/coordinates`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: CoordinatePayload) => {
      const res = await fetch(`/api/projects/${projectId}/coordinates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ProjectCoordinate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast({ title: 'Точка добавлена' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & CoordinatePayload) => {
      const res = await fetch(`/api/projects/${projectId}/coordinates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ProjectCoordinate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast({ title: 'Точка обновлена' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/coordinates/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast({ title: 'Точка удалена' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: err.message });
    },
  });

  return { coordinates, isLoading, addMutation, updateMutation, deleteMutation };
}
