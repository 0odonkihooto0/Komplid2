'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface RequestCommentData {
  id: string;
  text: string;
  requestId: string;
  authorId: string;
  author: CommentAuthor;
  parentId: string | null;
  replies?: RequestCommentData[];
  createdAt: string;
  updatedAt: string;
}

// ─── Хук загрузки комментариев ───────────────────────────────────────────────

export function useRequestComments(objectId: string, requestId: string) {
  const { data, isLoading } = useQuery<RequestCommentData[]>({
    queryKey: ['request-comments', objectId, requestId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/material-requests/${requestId}/comments`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки комментариев');
      return json.data as RequestCommentData[];
    },
    enabled: !!objectId && !!requestId,
  });
  return { comments: data ?? [], isLoading };
}

// ─── Хук добавления комментария ──────────────────────────────────────────────

export function useAddComment(objectId: string, requestId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { text: string; parentId?: string }) => {
      const res = await fetch(
        `/api/projects/${objectId}/material-requests/${requestId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка добавления комментария');
      return json.data as RequestCommentData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request-comments', objectId, requestId] });
      qc.invalidateQueries({ queryKey: ['material-request', objectId, requestId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук редактирования комментария ─────────────────────────────────────────

export function useEditComment(objectId: string, requestId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
      const res = await fetch(
        `/api/projects/${objectId}/material-requests/${requestId}/comments/${commentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка редактирования комментария');
      return json.data as RequestCommentData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request-comments', objectId, requestId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук удаления комментария ────────────────────────────────────────────────

export function useDeleteComment(objectId: string, requestId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(
        `/api/projects/${objectId}/material-requests/${requestId}/comments/${commentId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления комментария');
      return commentId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request-comments', objectId, requestId] });
      qc.invalidateQueries({ queryKey: ['material-request', objectId, requestId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
