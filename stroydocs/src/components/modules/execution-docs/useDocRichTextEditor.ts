'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export function useDocRichTextEditor(
  projectId: string,
  contractId: string,
  docId: string
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const baseUrl = `/api/objects/${projectId}/contracts/${contractId}/execution-docs/${docId}`;

  /** Загрузить рендеренный HTML для TipTap (overrideHtml или Handlebars-рендер) */
  const { data: htmlData, isLoading } = useQuery<{ html: string }>({
    queryKey: ['execution-doc-html', docId],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/rendered-html`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 0,
  });

  /** Сохранить overrideHtml + перегенерировать PDF */
  const saveMutation = useMutation({
    mutationFn: async (html: string) => {
      // Сохранить overrideHtml
      const patchRes = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrideHtml: html }),
      });
      const patchJson = await patchRes.json();
      if (!patchJson.success) throw new Error(patchJson.error);

      // Перегенерировать PDF с новым HTML
      const genRes = await fetch(`${baseUrl}/generate-pdf`, { method: 'POST' });
      const genJson = await genRes.json();
      if (!genJson.success) throw new Error(genJson.error);

      return genJson.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      queryClient.invalidateQueries({ queryKey: ['execution-doc-html', docId] });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Документ сохранён и PDF перегенерирован' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка сохранения', description: error.message, variant: 'destructive' });
    },
  });

  /** Сбросить overrideHtml (вернуться к автогенерации) */
  const resetMutation = useMutation({
    mutationFn: async () => {
      const patchRes = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrideHtml: null }),
      });
      const patchJson = await patchRes.json();
      if (!patchJson.success) throw new Error(patchJson.error);

      const genRes = await fetch(`${baseUrl}/generate-pdf`, { method: 'POST' });
      const genJson = await genRes.json();
      if (!genJson.success) throw new Error(genJson.error);

      return genJson.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      queryClient.invalidateQueries({ queryKey: ['execution-doc-html', docId] });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Документ сброшен к автогенерации' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка сброса', description: error.message, variant: 'destructive' });
    },
  });

  return {
    initialHtml: htmlData?.html ?? '',
    isLoading,
    saveMutation,
    resetMutation,
  };
}
