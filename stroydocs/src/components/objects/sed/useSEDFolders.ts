'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SEDFolderItem {
  id: string;
  name: string;
  order: number;
  parentId: string | null;
  children: SEDFolderItem[];
  _count: { documentLinks: number };
}

export function useSEDFolders(objectId: string) {
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery<SEDFolderItem[]>({
    queryKey: ['sed-folders', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/sed/folders`);
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json.data;
    },
  });

  const invalidateFolders = () =>
    queryClient.invalidateQueries({ queryKey: ['sed-folders', objectId] });

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/projects/${objectId}/sed/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Ошибка создания папки');
      return json.data as SEDFolderItem;
    },
    onSuccess: invalidateFolders,
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/projects/${objectId}/sed/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Ошибка переименования');
      return json.data as SEDFolderItem;
    },
    onSuccess: invalidateFolders,
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${objectId}/sed/folders/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: invalidateFolders,
  });

  const moveDocToFolder = useMutation({
    mutationFn: async ({ docId, folderId }: { docId: string; folderId: string }) => {
      const res = await fetch(`/api/projects/${objectId}/sed/${docId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Ошибка перемещения');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sed', objectId] }),
  });

  return {
    folders,
    isLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    moveDocToFolder,
  };
}
