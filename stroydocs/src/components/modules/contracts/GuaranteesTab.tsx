'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatCurrency } from '@/utils/format';
import { useGuarantees, type ContractGuarantee } from './useGuarantees';
import { AddGuaranteeDialog } from './AddGuaranteeDialog';

const STATUS_LABELS: Record<string, string> = {
  RETAINED: 'Удержано',
  RELEASED: 'Возвращено',
  PARTIAL: 'Частично',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  RETAINED: 'default',
  RELEASED: 'secondary',
  PARTIAL: 'outline',
};

interface Props {
  projectId: string;
  contractId: string;
}

export function GuaranteesTab({ projectId, contractId }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const { guarantees, isLoading, deleteMutation } = useGuarantees(projectId, contractId);

  const columns: ColumnDef<ContractGuarantee>[] = [
    {
      accessorKey: 'amount',
      header: 'Сумма',
      cell: ({ row }) => formatCurrency(row.getValue<number>('amount')),
    },
    {
      accessorKey: 'percentage',
      header: '% от контракта',
      cell: ({ row }) => {
        const v = row.getValue<number | null>('percentage');
        return v != null ? `${v}%` : '—';
      },
    },
    {
      accessorKey: 'retentionDate',
      header: 'Дата удержания',
      cell: ({ row }) => {
        const v = row.getValue<string | null>('retentionDate');
        return v ? formatDate(v) : '—';
      },
    },
    {
      accessorKey: 'releaseDate',
      header: 'Дата возврата',
      cell: ({ row }) => {
        const v = row.getValue<string | null>('releaseDate');
        return v ? formatDate(v) : '—';
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
          aria-label="Удалить гарантийное удержание"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Гарантийные удержания по контракту</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {!isLoading && guarantees.length === 0 ? (
        <EmptyState
          title="Гарантийные удержания не найдены"
          description="Добавьте первое гарантийное удержание по контракту"
        />
      ) : (
        <DataTable columns={columns} data={guarantees} />
      )}

      <AddGuaranteeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        contractId={contractId}
      />
    </div>
  );
}
