'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// Типы ответов API
interface ClosurePackage {
  id: string;
  number: string;
  name: string;
  status: string;
  notes: string | null;
  executionDocIds: string[];
  registryIds: string[];
  archiveDocIds: string[];
  s3Key: string | null;
  fileName: string | null;
  exportedAt: string | null;
  createdAt: string;
  createdBy: { firstName: string; lastName: string; middleName: string | null };
}

interface AvailableDoc {
  id: string;
  type?: string;
  number?: string;
  title?: string;
  name?: string;
  fileName?: string;
  category?: string;
  cipher?: string;
  status?: string;
  s3Key: string | null;
  contractId: string;
  idCategory?: string | null;
  createdAt: string;
}

interface AvailableDocsResponse {
  executionDocs: AvailableDoc[];
  registries: AvailableDoc[];
  archiveDocs: AvailableDoc[];
  contracts: Array<{ id: string; number: string; name: string }>;
}

// Загрузка списка пакетов
export function useClosurePackages(objectId: string) {
  const { data, isLoading } = useQuery<{ data: ClosurePackage[]; meta?: { total: number } }>({
    queryKey: ['closure-packages', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/closure-packages?limit=50`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
  });

  return {
    packages: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    isLoading,
  };
}

// Загрузка доступных документов для пакета
export function useAvailableDocs(objectId: string, enabled: boolean) {
  const { data, isLoading } = useQuery<AvailableDocsResponse>({
    queryKey: ['closure-packages-available', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/closure-packages/available-docs`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled,
  });

  return {
    executionDocs: data?.executionDocs ?? [],
    registries: data?.registries ?? [],
    archiveDocs: data?.archiveDocs ?? [],
    contracts: data?.contracts ?? [],
    isLoading,
  };
}

// Создание пакета
export function useCreatePackage(objectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      number?: string;
      notes?: string;
      executionDocIds: string[];
      registryIds: string[];
      archiveDocIds: string[];
    }) => {
      const res = await fetch(`/api/objects/${objectId}/closure-packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ClosurePackage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closure-packages', objectId] });
      toast({ title: 'Пакет создан' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка создания пакета', description: error.message, variant: 'destructive' });
    },
  });
}

// Удаление пакета
export function useDeletePackage(objectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (packageId: string) => {
      const res = await fetch(`/api/objects/${objectId}/closure-packages/${packageId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closure-packages', objectId] });
      toast({ title: 'Пакет удалён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка удаления', description: error.message, variant: 'destructive' });
    },
  });
}

// Генерация ZIP-архива пакета
export function useGeneratePackage(objectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (packageId: string) => {
      const res = await fetch(`/api/objects/${objectId}/closure-packages/${packageId}/generate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { package: ClosurePackage; downloadUrl: string; filesIncluded: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['closure-packages', objectId] });
      toast({ title: `Пакет сформирован (${data.filesIncluded} файлов)` });
      // Открыть ссылку для скачивания
      window.open(data.downloadUrl, '_blank');
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка генерации', description: error.message, variant: 'destructive' });
    },
  });
}
