'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export function usePhotoAnnotations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveAnnotationsMutation = useMutation({
    mutationFn: async ({ photoId, annotations }: { photoId: string; annotations: unknown }) => {
      const res = await fetch(`/api/photos/${photoId}/annotations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotations }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      toast({ title: 'Аннотации сохранены' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { saveAnnotations: saveAnnotationsMutation.mutate, isSaving: saveAnnotationsMutation.isPending };
}
