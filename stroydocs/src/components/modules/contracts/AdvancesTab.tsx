'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatCurrency } from '@/utils/format';
import { useAdvances, type ContractAdvance } from './useAdvances';
import { AddAdvanceDialog } from './AddAdvanceDialog';

interface Props {
  projectId: string;
  contractId: string;
}

export function AdvancesTab({ projectId, contractId }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const { advances, isLoading, deleteMutation } = useAdvances(projectId, contractId);

  const columns: ColumnDef<ContractAdvance>[] = [
    {
      accessorKey: 'number',
      header: 'Номер',
      cell: ({ row }) => row.getValue<string | null>('number') ?? '—',
    },
    {
      accessorKey: 'date',
      header: 'Дата',
      cell: ({ row }) => formatDate(row.getValue<string>('date')),
    },
    {
      accessorKey: 'amount',
      header: 'Сумма',
      cell: ({ row }) => formatCurrency(row.getValue<number>('amount')),
    },
    {
      accessorKey: 'budgetType',
      header: 'Тип бюджета',
      cell: ({ row }) => row.getValue<string | null>('budgetType') ?? '—',
    },
    {
      accessorKey: 'description',
      header: 'Описание',
      cell: ({ row }) => row.getValue<string | null>('description') ?? '—',
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
          aria-label="Удалить аванс"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Данные об авансовых платежах, внесённых на вкладке Платежи, на вкладку Авансы не передаются.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Авансовые платежи по контракту</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {!isLoading && advances.length === 0 ? (
        <EmptyState
          title="Авансы не найдены"
          description="Добавьте первый авансовый платёж по контракту"
        />
      ) : (
        <DataTable columns={columns} data={advances} />
      )}

      <AddAdvanceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        contractId={contractId}
      />
    </div>
  );
}
