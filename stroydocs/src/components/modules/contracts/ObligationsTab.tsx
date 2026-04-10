'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatCurrency } from '@/utils/format';
import { useObligations, type ContractObligation } from './useObligations';
import { AddObligationDialog } from './AddObligationDialog';

interface ObligationsTabProps {
  projectId: string;
  contractId: string;
  addObligationOpen: boolean;
  setAddObligationOpen: (v: boolean) => void;
}

// Цвет бейджа в зависимости от статуса обязательства
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  COMPLETED: 'secondary',
  OVERDUE: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активно',
  COMPLETED: 'Выполнено',
  OVERDUE: 'Просрочено',
};

export function ObligationsTab({
  projectId,
  contractId,
  addObligationOpen,
  setAddObligationOpen,
}: ObligationsTabProps) {
  const { obligations, isLoading, deleteMutation } = useObligations(projectId, contractId);

  const columns: ColumnDef<ContractObligation>[] = [
    {
      accessorKey: 'description',
      header: 'Описание',
    },
    {
      accessorKey: 'amount',
      header: 'Сумма',
      cell: ({ row }) => {
        const amount = row.getValue<number | null>('amount');
        return amount != null ? formatCurrency(amount) : '—';
      },
    },
    {
      accessorKey: 'deadline',
      header: 'Срок',
      cell: ({ row }) => {
        const deadline = row.getValue<string | null>('deadline');
        return deadline ? formatDate(deadline) : '—';
      },
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => {
        const status = row.getValue<string>('status');
        return (
          <Badge variant={STATUS_VARIANTS[status] ?? 'default'}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
        );
      },
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
          aria-label="Удалить обязательство"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Обязательства по контракту</h3>
        <Button size="sm" onClick={() => setAddObligationOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {!isLoading && obligations.length === 0 ? (
        <EmptyState
          title="Обязательства не найдены"
          description="Добавьте первое обязательство по контракту"
        />
      ) : (
        <DataTable
          columns={columns}
          data={obligations}
          searchColumn="description"
          searchPlaceholder="Поиск по описанию..."
        />
      )}

      <AddObligationDialog
        open={addObligationOpen}
        onOpenChange={setAddObligationOpen}
        projectId={projectId}
        contractId={contractId}
      />
    </div>
  );
}
