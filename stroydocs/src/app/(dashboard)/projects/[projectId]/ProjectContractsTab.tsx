'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useContractsTable, type ContractItem } from '@/components/modules/contracts/useContractsTable';
import { CreateContractDialog } from '@/components/modules/contracts/CreateContractDialog';

interface Props {
  projectId: string;
}

export function ProjectContractsTab({ projectId }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const { contracts, columns: baseColumns, isLoading } = useContractsTable(projectId);

  // Обернём номер ссылкой
  const columns: ColumnDef<ContractItem, unknown>[] = useMemo(() => baseColumns.map((col, i) => {
    if (i === 0) {
      return {
        ...col,
        cell: ({ row }) => (
          <Link
            href={`/objects/${projectId}/contracts/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.number}
          </Link>
        ),
      };
    }
    return col;
  }), [baseColumns, projectId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Основные договоры для dropdown в создании субдоговора
  const mainContracts = contracts
    .filter((c) => c.type === 'MAIN')
    .map((c) => ({ id: c.id, number: c.number, name: c.name }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Новый договор
        </Button>
      </div>
      {contracts.length === 0 ? (
        <EmptyState
          title="Нет договоров"
          description="Создайте первый договор для этого проекта"
        />
      ) : (
        <DataTable columns={columns} data={contracts} searchColumn="number" searchPlaceholder="Поиск по номеру..." />
      )}
      <CreateContractDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        parentContracts={mainContracts}
      />
    </div>
  );
}
