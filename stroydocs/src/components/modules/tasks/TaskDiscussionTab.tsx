'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { TaskComment } from './useTaskDetail';

interface Props {
  comments: TaskComment[];
  onAddComment: (text: string) => void;
}

export function TaskDiscussionTab({ comments, onAddComment }: Props) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setText('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pb-2">
        {comments.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Комментариев пока нет</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px]">
                {comment.author.firstName[0]}{comment.author.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{comment.author.firstName} {comment.author.lastName}</span>
                <span className="text-xs text-gray-400">
                  {new Date(comment.createdAt).toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="mt-0.5 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                {comment.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t pt-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Написать комментарий... (Ctrl+Enter для отправки)"
          rows={2}
          className="mb-2 resize-none text-sm"
        />
        <Button size="sm" onClick={handleSubmit} disabled={!text.trim()}>Отправить</Button>
      </div>
    </div>
  );
}
