'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/format';
import { useDocComments, type DocComment } from './useDocComments';
import { AddDocCommentForm } from './AddDocCommentForm';
import { DocCommentSheet } from './DocCommentSheet';

const URGENCY_LABELS: Record<string, string> = {
  CRITICAL: 'Критическая',
  HIGH: 'Высокая',
  NORMAL: 'Обычная',
  LOW: 'Низкая',
};

interface Props {
  projectId: string;
  contractId: string;
  docId: string;
}

export function DocCommentsList({ projectId, contractId, docId }: Props) {
  const [selectedComment, setSelectedComment] = useState<DocComment | null>(null);
  const { comments, isLoading, deleteMutation } = useDocComments(projectId, contractId, docId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const openCount = comments.filter((c) => c.status === 'OPEN').length;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">
        Замечания ({comments.length}){openCount > 0 && ` · ${openCount} открытых`}
      </h3>

      <div className="space-y-2">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-md border p-3 space-y-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedComment(comment)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {comment.commentNumber && (
                  <span className="text-xs text-muted-foreground font-mono">
                    №{comment.commentNumber}
                  </span>
                )}
                <Badge variant={comment.status === 'OPEN' ? 'destructive' : 'secondary'} className="text-xs">
                  {comment.status === 'OPEN' ? 'Открыто' : 'Устранено'}
                </Badge>
                {comment.urgency && (
                  <Badge variant="outline" className="text-xs">
                    {URGENCY_LABELS[comment.urgency] ?? comment.urgency}
                  </Badge>
                )}
                {comment._count.replies > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {comment._count.replies} отв.
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(comment.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            <p className="text-sm line-clamp-2">{comment.text}</p>
            <div className="text-xs text-muted-foreground">
              {comment.author.lastName} {comment.author.firstName} · {formatDate(comment.createdAt)}
            </div>
          </div>
        ))}
      </div>

      <AddDocCommentForm projectId={projectId} contractId={contractId} docId={docId} />

      <DocCommentSheet
        comment={selectedComment}
        open={!!selectedComment}
        onClose={() => setSelectedComment(null)}
        projectId={projectId}
        contractId={contractId}
        docId={docId}
      />
    </div>
  );
}
