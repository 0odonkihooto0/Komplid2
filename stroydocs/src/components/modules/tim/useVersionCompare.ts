'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { BimModelDiff } from '@/lib/bim/compare-models';

interface CompareResponse {
  modelA: { id: string; name: string };
  modelB: { id: string; name: string };
  diff: BimModelDiff;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export function useVersionCompare(projectId: string) {
  const { toast } = useToast();
  const [modelIdA, setModelIdA] = useState<string | null>(null);
  const [modelIdB, setModelIdB] = useState<string | null>(null);

  const mutation = useMutation<CompareResponse, Error>({
    mutationFn: async () => {
      if (!modelIdA || !modelIdB) throw new Error('Выберите две модели для сравнения');

      const res = await fetch(
        `/api/projects/${projectId}/bim/models/compare`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelIdA, modelIdB }),
        }
      );

      const json: ApiResponse<CompareResponse> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка сравнения');
      return json.data;
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка сравнения', description: error.message, variant: 'destructive' });
    },
  });

  const canCompare = Boolean(modelIdA && modelIdB && modelIdA !== modelIdB);

  return {
    modelIdA,
    setModelIdA,
    modelIdB,
    setModelIdB,
    canCompare,
    result: mutation.data ?? null,
    isPending: mutation.isPending,
    runCompare: () => mutation.mutate(),
    reset: () => mutation.reset(),
  };
}
