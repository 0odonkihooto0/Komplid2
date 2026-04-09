'use client';

import { CheckCircle, Circle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DOC_COMMENT_STATUS_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import { useDocComments } from './useDocComments';
import { AddDocCommentForm } from './AddDocCommentForm';

interface Props {
  projectId: string;
  contractId: string;
  docId: string;
}

export function DocCommentsList({ projectId, contractId, docId }: Props) {
  const { comments, isLoading, toggleStatusMutation, deleteMutation } = useDocComments(
    projectId,
    contractId,
    docId
  );

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Замечания ({comments.length})</h3>

      <div className="space-y-2">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={comment.status}
                  label={DOC_COMMENT_STATUS_LABELS[comment.status]}
                />
                <span className="text-xs text-muted-foreground">
                  {comment.author.lastName} {comment.author.firstName}
                </span>
                {comment.pageNumber && (
                  <span className="text-xs text-muted-foreground">стр. {comment.pageNumber}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toggleStatusMutation.mutate({
                      commentId: comment.id,
                      status: comment.status === 'OPEN' ? 'RESOLVED' : 'OPEN',
                    })
                  }
                  title={comment.status === 'OPEN' ? 'Устранено' : 'Переоткрыть'}
                >
                  {comment.status === 'OPEN' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-orange-600" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(comment.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <p className="text-sm">{comment.text}</p>
            <div className="text-xs text-muted-foreground">
              {formatDate(comment.createdAt)}
              {comment.resolvedBy && comment.resolvedAt && (
                <span>
                  {' '}
                  | Устранил: {comment.resolvedBy.lastName} {comment.resolvedBy.firstName},{' '}
                  {formatDate(comment.resolvedAt)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <AddDocCommentForm projectId={projectId} contractId={contractId} docId={docId} />
    </div>
  );
}
