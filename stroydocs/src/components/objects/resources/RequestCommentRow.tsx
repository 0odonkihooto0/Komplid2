'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Pencil, CornerDownRight } from 'lucide-react';
import { useAddComment, useEditComment, useDeleteComment, type RequestCommentData } from './useRequestComments';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function AuthorAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
      {initials}
    </div>
  );
}

interface Props {
  comment: RequestCommentData;
  sessionUserId: string | undefined;
  objectId: string;
  requestId: string;
  depth?: number;
}

export function RequestCommentRow({ comment, sessionUserId, objectId, requestId, depth = 0 }: Props) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const addComment = useAddComment(objectId, requestId);
  const editComment = useEditComment(objectId, requestId);
  const deleteComment = useDeleteComment(objectId, requestId);

  const isOwn = comment.authorId === sessionUserId;
  const authorName = `${comment.author.firstName} ${comment.author.lastName}`;

  function handleReply() {
    if (!replyText.trim()) return;
    addComment.mutate({ text: replyText.trim(), parentId: comment.id }, {
      onSuccess: () => { setReplyText(''); setReplyOpen(false); },
    });
  }

  function handleEdit() {
    if (!editText.trim()) return;
    editComment.mutate({ commentId: comment.id, text: editText.trim() }, {
      onSuccess: () => setEditOpen(false),
    });
  }

  return (
    <div className={depth > 0 ? 'pl-10 border-l border-muted ml-4' : ''}>
      <div className="flex gap-3 py-3">
        <AuthorAvatar firstName={comment.author.firstName} lastName={comment.author.lastName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{authorName}</span>
            <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
            {comment.createdAt !== comment.updatedAt && (
              <span className="text-xs text-muted-foreground">(изменён)</span>
            )}
          </div>
          {editOpen ? (
            <div className="mt-1 space-y-2">
              <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} className="text-sm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit} disabled={editComment.isPending}>Сохранить</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditOpen(false); setEditText(comment.text); }}>Отмена</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.text}</p>
          )}
          <div className="flex gap-2 mt-1">
            {depth === 0 && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={() => setReplyOpen(v => !v)}>
                <CornerDownRight className="h-3 w-3" /> Ответить
              </Button>
            )}
            {isOwn && !editOpen && (
              <>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3 w-3" /> Изменить
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => deleteComment.mutate(comment.id)} disabled={deleteComment.isPending}>
                  <Trash2 className="h-3 w-3" /> Удалить
                </Button>
              </>
            )}
          </div>
          {replyOpen && (
            <div className="mt-2 space-y-2">
              <Textarea placeholder="Напишите ответ..." value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} className="text-sm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReply} disabled={addComment.isPending}>Отправить</Button>
                <Button size="sm" variant="ghost" onClick={() => { setReplyOpen(false); setReplyText(''); }}>Отмена</Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {(comment.replies ?? []).map(reply => (
        <RequestCommentRow key={reply.id} comment={reply} sessionUserId={sessionUserId} objectId={objectId} requestId={requestId} depth={1} />
      ))}
    </div>
  );
}
