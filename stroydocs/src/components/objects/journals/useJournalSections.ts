'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ApiResponse } from '@/types/api';
import type { SectionWithEntries } from './journal-constants';

export function useJournalSections(objectId: string, journalId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sectionsUrl = `/api/projects/${objectId}/journals/${journalId}/sections`;

  // Загрузка разделов с записями
  const {
    data: sections,
    isLoading,
    error,
  } = useQuery<SectionWithEntries[]>({
    queryKey: ['journal-sections', objectId, journalId],
    queryFn: async () => {
      const res = await fetch(sectionsUrl);
      if (!res.ok) throw new Error('Ошибка загрузки разделов');
      const json: ApiResponse<SectionWithEntries[]> = await res.json();
      if (!json.success) throw new Error('Ошибка загрузки разделов');
      return json.data;
    },
    enabled: !!objectId && !!journalId,
  });

  // Автозаполнение раздела
  const fillMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const res = await fetch(`${sectionsUrl}/${sectionId}/fill`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка автозаполнения');
      return json.data as { created: number; message?: string };
    },
    onSuccess: (data) => {
      const msg = data.created > 0
        ? `Создано записей: ${data.created}`
        : (data.message ?? 'Нет данных для автозаполнения');
      toast({ title: msg });
      queryClient.invalidateQueries({ queryKey: ['journal-sections', objectId, journalId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  return {
    sections: sections ?? [],
    isLoading,
    error,
    fillMutation,
  };
}
