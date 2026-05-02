'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface GuestComment {
  id: string;
  content: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface CommentsResponse {
  items: GuestComment[];
  total: number;
  page: number;
  limit: number;
}

// Метки статусов комментариев на русском
const STATUS_LABELS: Record<GuestComment['status'], string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Решён',
  DISMISSED: 'Отклонён',
};

const STATUS_VARIANTS: Record<GuestComment['status'], 'default' | 'secondary' | 'outline'> = {
  OPEN: 'default',
  IN_PROGRESS: 'secondary',
  RESOLVED: 'outline',
  DISMISSED: 'outline',
};

interface Props {
  projectId: string;
  canComment: boolean;
}

export default function GuestCommentsThread({ projectId, canComment }: Props) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const { data, isLoading } = useQuery<CommentsResponse>({
    queryKey: ['guest-comments', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/guest/projects/${projectId}/comments`);
      const json = await res.json() as { success: boolean; data: CommentsResponse; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки комментариев');
      return json.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (commentContent: string) => {
      const res = await fetch(`/api/guest/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'GENERAL',
          targetId: projectId,
          content: commentContent,
        }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка отправки комментария');
    },
    onSuccess: () => {
      setContent('');
      void queryClient.invalidateQueries({ queryKey: ['guest-comments', projectId] });
    },
  });

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    mutation.mutate(trimmed);
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка комментариев...</p>;
  }

  const comments = data?.items ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Комментарии</h2>

      {/* Форма добавления нового комментария */}
      {canComment && (
        <div className="space-y-2">
          <Textarea
            placeholder="Введите комментарий..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={5000}
          />
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || mutation.isPending}
            size="sm"
          >
            {mutation.isPending ? 'Отправка...' : 'Отправить'}
          </Button>
          {mutation.isError && (
            <p className="text-sm text-destructive">{mutation.error.message}</p>
          )}
        </div>
      )}

      {/* Список комментариев */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Комментарии отсутствуют.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="border rounded-md p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {c.author.firstName} {c.author.lastName}
                </span>
                <Badge variant={STATUS_VARIANTS[c.status]}>{STATUS_LABELS[c.status]}</Badge>
              </div>
              <p className="text-sm">{c.content}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleString('ru-RU')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
