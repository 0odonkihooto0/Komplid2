'use client';

import { DataTable } from '@/components/shared/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeTable } from './useEmployeeTable';

export function EmployeeTable() {
  const { employees, columns, isLoading } = useEmployeeTable();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={employees}
      searchColumn="fullName"
      searchPlaceholder="Поиск по ФИО или email..."
    />
  );
}
