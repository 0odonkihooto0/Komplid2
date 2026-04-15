'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { IfcDiffResult } from '@/types/bim-diff';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export function useVersionCompare(projectId: string, modelId: string) {
  const { toast } = useToast();
  const [versionIdOld, setVersionIdOld] = useState<string | null>(null);
  const [versionIdNew, setVersionIdNew] = useState<string | null>(null);

  const mutation = useMutation<IfcDiffResult, Error>({
    mutationFn: async () => {
      if (!versionIdOld || !versionIdNew) {
        throw new Error('Выберите две версии для сравнения');
      }

      const res = await fetch(
        `/api/projects/${projectId}/bim/models/${modelId}/diff`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionIdOld, versionIdNew }),
        }
      );

      const json: ApiResponse<IfcDiffResult> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка сравнения версий');
      return json.data;
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка сравнения',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const canCompare = Boolean(
    versionIdOld && versionIdNew && versionIdOld !== versionIdNew
  );

  return {
    versionIdOld,
    setVersionIdOld,
    versionIdNew,
    setVersionIdNew,
    canCompare,
    result: mutation.data ?? null,
    isPending: mutation.isPending,
    runCompare: () => mutation.mutate(),
    reset: () => mutation.reset(),
  };
}
