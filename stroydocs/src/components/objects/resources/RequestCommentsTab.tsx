'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRequestComments, useAddComment } from './useRequestComments';
import { RequestCommentRow } from './RequestCommentRow';

interface Props {
  objectId: string;
  requestId: string;
}

export function RequestCommentsTab({ objectId, requestId }: Props) {
  const { data: session } = useSession();
  const { comments, isLoading } = useRequestComments(objectId, requestId);
  const addComment = useAddComment(objectId, requestId);
  const [newText, setNewText] = useState('');

  function handleSubmit() {
    if (!newText.trim()) return;
    addComment.mutate({ text: newText.trim() }, {
      onSuccess: () => setNewText(''),
    });
  }

  if (isLoading) {
    return <div className="py-8 text-sm text-center text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-2 pt-2">
      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">Комментариев пока нет</p>
      )}
      {comments.map(comment => (
        <RequestCommentRow
          key={comment.id}
          comment={comment}
          sessionUserId={session?.user?.id}
          objectId={objectId}
          requestId={requestId}
        />
      ))}
      <div className="border-t pt-4 space-y-2">
        <Textarea
          placeholder="Напишите комментарий..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          rows={3}
          className="text-sm"
        />
        <Button size="sm" onClick={handleSubmit} disabled={addComment.isPending || !newText.trim()}>
          Отправить
        </Button>
      </div>
    </div>
  );
}
