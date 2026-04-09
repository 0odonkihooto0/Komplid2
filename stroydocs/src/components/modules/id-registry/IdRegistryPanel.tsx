'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { BookOpen, FileDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/utils/format';

interface IdRegistry {
  id: string;
  name: string;
  sheetCount: number;
  s3Key: string | null;
  fileName: string | null;
  generatedAt: string | null;
  createdAt: string;
}

interface ApiResponse<T> { success: boolean; data: T }

interface Props {
  projectId: string;
  contractId: string;
}

/** Панель управления реестром ИД в договоре */
export function IdRegistryPanel({ projectId, contractId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const baseUrl = `/api/objects/${projectId}/contracts/${contractId}/id-registry`;

  const { data: registries = [], isLoading } = useQuery<IdRegistry[]>({
    queryKey: ['id-registry', contractId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      const json: ApiResponse<IdRegistry[]> = await res.json();
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Реестр исполнительной документации' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Ошибка создания');
    },
    onSuccess: () => {
      toast({ title: 'Реестр ИД создан' });
      queryClient.invalidateQueries({ queryKey: ['id-registry', contractId] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const generateMutation = useMutation({
    mutationFn: async (registryId: string) => {
      setGeneratingId(registryId);
      const res = await fetch(`${baseUrl}/${registryId}/generate`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Ошибка генерации');
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Реестр ИД сформирован' });
      queryClient.invalidateQueries({ queryKey: ['id-registry', contractId] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
    onSettled: () => setGeneratingId(null),
  });

  const downloadRegistry = async (registry: IdRegistry) => {
    if (!registry.s3Key) return;
    const res = await fetch(`/api/files/download?key=${encodeURIComponent(registry.s3Key)}`);
    const json = await res.json();
    if (json.data?.url) window.open(json.data.url, '_blank');
  };

  if (isLoading) return <div className="h-32 animate-pulse rounded-md bg-muted" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          Создать реестр ИД
        </Button>
      </div>

      {registries.length === 0 ? (
        <EmptyState
          title="Нет реестров ИД"
          description="Создайте реестр для автоматической нумерации всех документов по договору"
        />
      ) : (
        <div className="space-y-2">
          {registries.map((registry) => (
            <div
              key={registry.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{registry.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Создан: {formatDate(registry.createdAt)}
                    {registry.sheetCount > 0 && ` · ${registry.sheetCount} листов`}
                    {registry.generatedAt && ` · Сформирован: ${formatDate(registry.generatedAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateMutation.mutate(registry.id)}
                  disabled={generatingId === registry.id}
                >
                  {generatingId === registry.id ? 'Формирование...' : 'Сформировать'}
                </Button>
                {registry.s3Key && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadRegistry(registry)}
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
