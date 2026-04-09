'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/shared/DataTable';
import { useBatches } from './useBatches';

interface Props {
  contractId: string;
  materialId: string;
}

export function MaterialBatchesTable({ contractId, materialId }: Props) {
  const { batches, columns, isLoading } = useBatches(contractId, materialId);

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <DataTable
      columns={columns}
      data={batches}
      searchPlaceholder="Поиск по партиям..."
      searchColumn="batchNumber"
    />
  );
}
