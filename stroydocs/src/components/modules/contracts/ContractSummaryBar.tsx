'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/format';
import { useContractSummary } from './useContractSummary';

interface ContractSummaryBarProps {
  projectId: string;
  contractId: string;
}

export function ContractSummaryBar({ projectId, contractId }: ContractSummaryBarProps) {
  const { summary, isLoading } = useContractSummary(projectId, contractId);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex flex-col gap-1">
      <span>
        Всего документов: {summary.count} на сумму {formatCurrency(summary.totalAmount)}
      </span>
      <span>
        Платежи: плановые {formatCurrency(summary.plannedTotal)}, фактические{' '}
        {formatCurrency(summary.factTotal)}
      </span>
    </div>
  );
}
