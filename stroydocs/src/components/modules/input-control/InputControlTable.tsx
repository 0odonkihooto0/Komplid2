'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/shared/DataTable';
import { useInputControl } from './useInputControl';

interface Props {
  contractId: string;
}

export function InputControlTable({ contractId }: Props) {
  const { records, columns, isLoading } = useInputControl(contractId);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <DataTable
      columns={columns}
      data={records}
      searchPlaceholder="Поиск по материалу..."
      searchColumn="material"
    />
  );
}
