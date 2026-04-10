'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/utils/format';
import { useExecutionProgress, type ContractExecution } from './useExecutionProgress';
import { AddExecutionProgressDialog } from './AddExecutionProgressDialog';

interface Props {
  projectId: string;
  contractId: string;
}

export function ExecutionProgressTab({ projectId, contractId }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const { records, isLoading, deleteMutation } = useExecutionProgress(projectId, contractId);

  const columns: ColumnDef<ContractExecution>[] = [
    {
      accessorKey: 'date',
      header: 'Дата',
      cell: ({ row }) => formatDate(row.getValue<string>('date')),
    },
    {
      accessorKey: 'completionPercent',
      header: '% исполнения',
      cell: ({ row }) => {
        const v = row.getValue<number | null>('completionPercent');
        return v != null ? `${v}%` : '—';
      },
    },
    {
      accessorKey: 'workersCount',
      header: 'Рабочие',
      cell: ({ row }) => {
        const v = row.getValue<number | null>('workersCount');
        return v != null ? String(v) : '—';
      },
    },
    {
      accessorKey: 'equipmentCount',
      header: 'Техника',
      cell: ({ row }) => {
        const v = row.getValue<number | null>('equipmentCount');
        return v != null ? String(v) : '—';
      },
    },
    {
      accessorKey: 'notes',
      header: 'Примечания',
      cell: ({ row }) => row.getValue<string | null>('notes') ?? '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => deleteMutation.mutate(row.original.id)}
          disabled={deleteMutation.isPending}
          aria-label="Удалить запись"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Ход исполнения контракта</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {!isLoading && records.length === 0 ? (
        <EmptyState
          title="Записей нет"
          description="Добавьте первую запись о ходе исполнения контракта"
        />
      ) : (
        <DataTable columns={columns} data={records} />
      )}

      <AddExecutionProgressDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        contractId={contractId}
      />
    </div>
  );
}
