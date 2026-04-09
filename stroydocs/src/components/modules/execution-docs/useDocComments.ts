'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

interface DocComment {
  id: string;
  text: string;
  pageNumber: number | null;
  positionX: number | null;
  positionY: number | null;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
  resolvedBy: { id: string; firstName: string; lastName: string } | null;
  resolvedAt: string | null;
}

export function useDocComments(projectId: string, contractId: string, docId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const baseUrl = `/api/objects/${projectId}/contracts/${contractId}/execution-docs/${docId}/comments`;

  const { data: comments = [], isLoading } = useQuery<DocComment[]>({
    queryKey: ['doc-comments', docId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { text: string; pageNumber?: number }) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-comments', docId] });
      toast({ title: 'Замечание добавлено' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ commentId, status }: { commentId: string; status: 'OPEN' | 'RESOLVED' }) => {
      const res = await fetch(`${baseUrl}/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-comments', docId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`${baseUrl}/${commentId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-comments', docId] });
      toast({ title: 'Замечание удалено' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { comments, isLoading, createMutation, toggleStatusMutation, deleteMutation };
}
