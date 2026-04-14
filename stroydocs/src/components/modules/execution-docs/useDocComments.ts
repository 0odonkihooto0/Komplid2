'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface DocCommentReply {
  id: string;
  text: string;
  attachmentS3Keys: string[];
  commentId: string;
  authorId: string;
  author: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface DocComment {
  id: string;
  text: string;
  pageNumber: number | null;
  positionX: number | null;
  positionY: number | null;
  status: 'OPEN' | 'RESOLVED';
  // Расширенные поля
  commentNumber: number | null;
  urgency: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | null;
  remarkType: 'DESIGN' | 'QUALITY' | 'SAFETY' | 'PROCESS' | 'OTHER' | null;
  watcherIds: string[];
  plannedResolveDate: string | null;
  actualResolveDate: string | null;
  suggestion: string | null;
  attachmentS3Keys: string[];
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
  resolvedBy: { id: string; firstName: string; lastName: string } | null;
  resolvedAt: string | null;
  responsible: { id: string; firstName: string; lastName: string } | null;
  _count: { replies: number };
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
    mutationFn: async (data: {
      text: string;
      pageNumber?: number;
      urgency?: string;
      remarkType?: string;
      responsibleId?: string;
      plannedResolveDate?: string;
      suggestion?: string;
      attachmentS3Keys?: string[];
    }) => {
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

  const acceptMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`${baseUrl}/${commentId}/accept`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-comments', docId] });
      toast({ title: 'Замечание принято' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`${baseUrl}/${commentId}/return`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-comments', docId] });
      toast({ title: 'Замечание возвращено на доработку' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const repliesFn = async (commentId: string): Promise<DocCommentReply[]> => {
    const res = await fetch(`${baseUrl}/${commentId}/replies`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  };

  const addReplyMutation = useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
      const res = await fetch(`${baseUrl}/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doc-replies', variables.commentId] });
      toast({ title: 'Ответ добавлен' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return {
    comments,
    isLoading,
    createMutation,
    toggleStatusMutation,
    deleteMutation,
    acceptMutation,
    returnMutation,
    addReplyMutation,
    repliesFn,
  };
}
