'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/format';
import { type DocComment, type DocCommentReply, useDocComments } from './useDocComments';

const URGENCY_LABELS: Record<string, string> = {
  CRITICAL: 'Критическая',
  HIGH: 'Высокая',
  NORMAL: 'Обычная',
  LOW: 'Низкая',
};

const URGENCY_VARIANTS: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  CRITICAL: 'destructive',
  HIGH: 'destructive',
  NORMAL: 'default',
  LOW: 'secondary',
};

const REMARK_TYPE_LABELS: Record<string, string> = {
  DESIGN: 'Проектное',
  QUALITY: 'Качество',
  SAFETY: 'Безопасность',
  PROCESS: 'Процесс',
  OTHER: 'Прочее',
};

interface Props {
  comment: DocComment | null;
  open: boolean;
  onClose: () => void;
  projectId: string;
  contractId: string;
  docId: string;
}

export function DocCommentSheet({ comment, open, onClose, projectId, contractId, docId }: Props) {
  const [replyText, setReplyText] = useState('');
  const { acceptMutation, returnMutation, addReplyMutation, repliesFn } = useDocComments(
    projectId,
    contractId,
    docId
  );

  const { data: replies = [], isLoading: repliesLoading } = useQuery<DocCommentReply[]>({
    queryKey: ['doc-replies', comment?.id],
    queryFn: () => repliesFn(comment!.id),
    enabled: open && !!comment?.id,
  });

  if (!comment) return null;

  const handleReply = () => {
    if (!replyText.trim()) return;
    addReplyMutation.mutate(
      { commentId: comment.id, text: replyText.trim() },
      { onSuccess: () => setReplyText('') }
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {comment.commentNumber && (
              <span className="text-xs text-muted-foreground font-mono">
                №{comment.commentNumber}
              </span>
            )}
            <Badge variant={comment.status === 'OPEN' ? 'destructive' : 'secondary'}>
              {comment.status === 'OPEN' ? 'Открыто' : 'Устранено'}
            </Badge>
            {comment.urgency && (
              <Badge variant={URGENCY_VARIANTS[comment.urgency] ?? 'default'}>
                {URGENCY_LABELS[comment.urgency] ?? comment.urgency}
              </Badge>
            )}
            {comment.remarkType && (
              <Badge variant="outline">
                {REMARK_TYPE_LABELS[comment.remarkType] ?? comment.remarkType}
              </Badge>
            )}
          </div>
          <SheetTitle className="text-sm font-normal leading-snug">{comment.text}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="info" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="info">Информация</TabsTrigger>
            <TabsTrigger value="replies">
              Ответы{replies.length > 0 ? ` (${replies.length})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="flex-1 overflow-y-auto px-6 py-4">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs mb-0.5">Автор</dt>
                <dd>
                  {comment.author.lastName} {comment.author.firstName}
                  {' — '}{formatDate(comment.createdAt)}
                </dd>
              </div>
              {comment.responsible && (
                <div>
                  <dt className="text-muted-foreground text-xs mb-0.5">Ответственный за устранение</dt>
                  <dd>{comment.responsible.lastName} {comment.responsible.firstName}</dd>
                </div>
              )}
              {comment.plannedResolveDate && (
                <div>
                  <dt className="text-muted-foreground text-xs mb-0.5">Плановая дата устранения</dt>
                  <dd>{formatDate(comment.plannedResolveDate)}</dd>
                </div>
              )}
              {comment.actualResolveDate && (
                <div>
                  <dt className="text-muted-foreground text-xs mb-0.5">Фактическая дата устранения</dt>
                  <dd>{formatDate(comment.actualResolveDate)}</dd>
                </div>
              )}
              {comment.suggestion && (
                <div>
                  <dt className="text-muted-foreground text-xs mb-0.5">Предложения по устранению</dt>
                  <dd className="whitespace-pre-wrap">{comment.suggestion}</dd>
                </div>
              )}
              {comment.resolvedBy && comment.resolvedAt && (
                <div>
                  <dt className="text-muted-foreground text-xs mb-0.5">Принял</dt>
                  <dd>
                    {comment.resolvedBy.lastName} {comment.resolvedBy.firstName}
                    {' — '}{formatDate(comment.resolvedAt)}
                  </dd>
                </div>
              )}
            </dl>
          </TabsContent>

          <TabsContent value="replies" className="flex-1 flex flex-col overflow-hidden px-6 py-4 gap-3">
            <div className="flex-1 overflow-y-auto space-y-3">
              {repliesLoading && <Skeleton className="h-16 w-full" />}
              {!repliesLoading && replies.length === 0 && (
                <p className="text-sm text-muted-foreground">Ответов пока нет</p>
              )}
              {replies.map((reply) => (
                <div key={reply.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{reply.author.lastName} {reply.author.firstName}</span>
                    <span>·</span>
                    <span>{formatDate(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm">{reply.text}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Напишите ответ..."
                rows={2}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={handleReply}
                disabled={!replyText.trim() || addReplyMutation.isPending}
              >
                {addReplyMutation.isPending ? 'Отправка...' : 'Ответить'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="px-6 py-4 border-t flex gap-2">
          {comment.status === 'OPEN' ? (
            <Button
              size="sm"
              onClick={() => acceptMutation.mutate(comment.id, { onSuccess: onClose })}
              disabled={acceptMutation.isPending}
            >
              Принять
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => returnMutation.mutate(comment.id, { onSuccess: onClose })}
              disabled={returnMutation.isPending}
            >
              Вернуть на доработку
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
