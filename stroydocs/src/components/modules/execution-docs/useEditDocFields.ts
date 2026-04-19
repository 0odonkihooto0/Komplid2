'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

interface SaveFieldsArgs {
  overrideFields: Record<string, string>;
}

export function useEditDocFields(
  projectId: string,
  contractId: string,
  docId: string
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const baseUrl = `/api/projects/${projectId}/contracts/${contractId}/execution-docs/${docId}`;

  /** Сохранить overrideFields в БД */
  const saveFieldsMutation = useMutation({
    mutationFn: async ({ overrideFields }: SaveFieldsArgs) => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrideFields }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Поля сохранены' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка сохранения', description: error.message, variant: 'destructive' });
    },
  });

  /** Перегенерировать PDF после сохранения полей */
  const regeneratePdfMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/generate-pdf`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'PDF перегенерирован с новыми значениями' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка генерации PDF', description: error.message, variant: 'destructive' });
    },
  });

  /** Сохранить поля и сразу перегенерировать PDF */
  const saveAndRegenerate = async (overrideFields: Record<string, string>) => {
    await saveFieldsMutation.mutateAsync({ overrideFields });
    await regeneratePdfMutation.mutateAsync();
  };

  return {
    saveFieldsMutation,
    regeneratePdfMutation,
    saveAndRegenerate,
    isPending: saveFieldsMutation.isPending || regeneratePdfMutation.isPending,
  };
}
