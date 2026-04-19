'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Связанный документ исполнительной документации
interface LinkedDoc {
  id: string;
  number: string;
  type: string;
  status: string;
  title: string;
  createdAt: string;
  contract: { id: string; name: string };
}

interface LinkedDocEntry {
  linkId: string;
  linkedDoc: LinkedDoc;
}

// Хук: загрузить список связанных документов
export function useLinkedDocs(projectId: string, contractId: string, docId: string) {
  const baseUrl = `/api/projects/${projectId}/contracts/${contractId}/execution-docs/${docId}/linked-docs`;

  const { data = [], isLoading } = useQuery<LinkedDocEntry[]>({
    queryKey: ['linked-docs', docId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  return { data, isLoading };
}

// Хук: поиск доступных документов для привязки
export function useSearchAvailableDocs(
  projectId: string,
  contractId: string,
  docId: string,
  query: string,
  orgFilter: boolean,
  enabled: boolean
) {
  const baseUrl = `/api/projects/${projectId}/contracts/${contractId}/execution-docs/${docId}/linked-docs`;

  const { data = [], isLoading } = useQuery<LinkedDoc[]>({
    queryKey: ['linked-docs-search', docId, query, orgFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ mode: 'search', q: query, orgFilter: String(orgFilter) });
      const res = await fetch(`${baseUrl}?${params.toString()}`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
    enabled,
  });

  return { data, isLoading };
}

// Хук: добавить связанный документ
export function useAddLinkedDoc(projectId: string, contractId: string, docId: string) {
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/contracts/${contractId}/execution-docs/${docId}/linked-docs`;

  return useMutation({
    mutationFn: async ({ targetDocId }: { targetDocId: string }) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDocId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-docs', docId] });
    },
  });
}

// Хук: удалить связанный документ по linkId
export function useDeleteLinkedDoc(projectId: string, contractId: string, docId: string) {
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/contracts/${contractId}/execution-docs/${docId}/linked-docs`;

  return useMutation({
    mutationFn: async (linkId: string) => {
      const res = await fetch(`${baseUrl}/${linkId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-docs', docId] });
    },
  });
}
