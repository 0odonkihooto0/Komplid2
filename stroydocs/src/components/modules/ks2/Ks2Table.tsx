'use client';

import Link from 'next/link';
import { FileText, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/utils/format';
import { useKs2List } from './useKs2';

const STATUS_CONFIG = {
  DRAFT: { label: 'Черновик', variant: 'secondary' as const },
  IN_REVIEW: { label: 'На согласовании', variant: 'default' as const },
  APPROVED: { label: 'Утверждён', variant: 'default' as const },
  REJECTED: { label: 'Отклонён', variant: 'destructive' as const },
};

interface Props {
  projectId: string;
  contractId: string;
}

/** Таблица актов КС-2 по договору */
export function Ks2Table({ projectId, contractId }: Props) {
  const { acts, isLoading, deleteMutation } = useKs2List(projectId, contractId);

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-md bg-muted" />;
  }

  if (acts.length === 0) {
    return (
      <EmptyState
        title="Нет актов КС-2"
        description="Создайте первый акт о приёмке выполненных работ"
      />
    );
  }

  return (
    <div className="space-y-2">
      {acts.map((act) => {
        const statusConfig = STATUS_CONFIG[act.status] || STATUS_CONFIG.DRAFT;
        return (
          <div
            key={act.id}
            className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{act.number}</span>
                  <Badge variant={statusConfig.variant} className="text-xs">
                    {statusConfig.label}
                  </Badge>
                  {act.ks3Certificate && (
                    <Badge variant="outline" className="text-xs">КС-3</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(act.periodStart)} — {formatDate(act.periodEnd)}
                  {' · '}
                  Итого: {act.totalAmount.toLocaleString('ru-RU')} руб.
                  {act._count && ` · ${act._count.items} позиций`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/objects/${projectId}/contracts/${contractId}/ks2/${act.id}`}>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
              {act.status === 'DRAFT' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate(act.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
