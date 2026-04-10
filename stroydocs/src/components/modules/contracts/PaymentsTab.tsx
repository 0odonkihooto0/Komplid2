'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Info } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatCurrency } from '@/utils/format';
import { usePaymentsTab, type ContractPaymentItem } from './usePaymentsTab';
import { AddPaymentTabDialog } from './AddPaymentTabDialog';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  PLAN: 'Плановый',
  FACT: 'Фактический',
};

interface Props {
  projectId: string;
  contractId: string;
}

export function PaymentsTab({ projectId, contractId }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const { payments, isLoading, deleteMutation } = usePaymentsTab(projectId, contractId);

  const columns: ColumnDef<ContractPaymentItem>[] = [
    {
      accessorKey: 'paymentType',
      header: 'Тип',
      cell: ({ row }) => {
        const type = row.getValue<string>('paymentType');
        return (
          <Badge variant={type === 'FACT' ? 'default' : 'secondary'}>
            {PAYMENT_TYPE_LABELS[type] ?? type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'paymentDate',
      header: 'Дата',
      cell: ({ row }) => formatDate(row.getValue<string>('paymentDate')),
    },
    {
      accessorKey: 'amount',
      header: 'Сумма',
      cell: ({ row }) => formatCurrency(row.getValue<number>('amount')),
    },
    {
      accessorKey: 'limitYear',
      header: 'Лимит (год)',
      cell: ({ row }) => {
        const v = row.getValue<number | null>('limitYear');
        return v != null ? String(v) : '—';
      },
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
          aria-label="Удалить платёж"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Данные о платежах используются в виджетах на главной странице. Обращайте внимание на заполнение полей Лимит, год и Тип бюджета.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Платежи по контракту</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {!isLoading && payments.length === 0 ? (
        <EmptyState
          title="Платежи не найдены"
          description="Добавьте плановый или фактический платёж по контракту"
        />
      ) : (
        <DataTable columns={columns} data={payments} />
      )}

      <AddPaymentTabDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        contractId={contractId}
      />
    </div>
  );
}
