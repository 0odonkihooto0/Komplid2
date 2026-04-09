'use client';

import Link from 'next/link';
import { CalendarRange, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useContractsTable } from '@/components/modules/contracts/useContractsTable';
import { formatDate } from '@/utils/format';

interface Props {
  projectId: string;
}

/** Агрегированный вид графика производства работ по всем договорам проекта */
export function ProjectGanttView({ projectId }: Props) {
  const { contracts, isLoading } = useContractsTable(projectId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        График производства работ доступен для каждого договора отдельно.
      </p>
      {contracts.map((contract) => (
        <Card key={contract.id} className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{contract.number} — {contract.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {contract.startDate ? formatDate(contract.startDate) : '—'}{' '}→{' '}
              {contract.endDate ? formatDate(contract.endDate) : '—'}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/objects/${projectId}/contracts/${contract.id}?tab=gantt`}>
              <CalendarRange className="mr-1.5 h-4 w-4" />
              Открыть график
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Link>
          </Button>
        </Card>
      ))}
      {contracts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Нет договоров — создайте договор чтобы начать планирование.
        </p>
      )}
    </div>
  );
}
