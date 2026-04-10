'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trash2, Plus, Link2 } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/utils/format';
import { useLinkedContracts } from './useLinkedContracts';
import { LinkContractDialog } from './LinkContractDialog';
import type { ContractStatus } from '@prisma/client';

interface SubContract {
  id: string;
  number: string;
  name: string;
  status: ContractStatus;
  _count: { subContracts: number };
}

interface ParentContract {
  id: string;
  number: string;
  name: string;
}

interface Props {
  projectId: string;
  contractId: string;
  childContracts: SubContract[];
  parentContract: ParentContract | null | undefined;
  linkContractOpen: boolean;
  setLinkContractOpen: (v: boolean) => void;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активный',
  COMPLETED: 'Завершён',
  TERMINATED: 'Расторгнут',
};

export function LinkedContractsTab({
  projectId,
  contractId,
  childContracts,
  parentContract,
  linkContractOpen,
  setLinkContractOpen,
}: Props) {
  const { unlinkMutation } = useLinkedContracts(projectId, contractId);

  const columns: ColumnDef<SubContract>[] = [
    {
      accessorKey: 'number',
      header: 'Номер',
      cell: ({ row }) => (
        <Link
          href={`/objects/${projectId}/contracts/${row.original.id}`}
          className="text-blue-600 hover:underline text-sm"
        >
          {row.original.number}
        </Link>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Наименование',
      cell: ({ row }) => <span className="text-sm">{row.original.name}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'subCount',
      header: 'Дочерних',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original._count.subContracts}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Отвязать договор"
          onClick={() => unlinkMutation.mutate(row.original.id)}
          disabled={unlinkMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Родительский договор */}
      {parentContract && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm">
          <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Основной договор:</span>
          <Link
            href={`/objects/${projectId}/contracts/${parentContract.id}`}
            className="text-blue-600 hover:underline font-medium"
          >
            {parentContract.number} — {parentContract.name}
          </Link>
        </div>
      )}

      {/* Заголовок и кнопка добавления */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Субподрядные договоры</h3>
        <Button size="sm" onClick={() => setLinkContractOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {/* Таблица или пустое состояние */}
      {childContracts.length === 0 ? (
        <EmptyState
          title="Нет связанных договоров"
          description="Привяжите субподрядные договоры к этому договору"
        />
      ) : (
        <DataTable
          columns={columns}
          data={childContracts}
          searchColumn="name"
          searchPlaceholder="Поиск по наименованию..."
        />
      )}

      <LinkContractDialog
        open={linkContractOpen}
        onOpenChange={setLinkContractOpen}
        projectId={projectId}
        contractId={contractId}
      />
    </div>
  );
}
