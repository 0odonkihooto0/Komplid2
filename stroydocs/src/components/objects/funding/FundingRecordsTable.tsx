'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  RECORD_TYPE_LABELS,
  BUDGET_LABELS,
  type FundingRecord,
} from './useFundingRecords';

interface FundingRecordsTableProps {
  records: FundingRecord[];
  onEdit: (record: FundingRecord) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function FundingRecordsTable({
  records,
  onEdit,
  onDelete,
  isDeleting,
}: FundingRecordsTableProps) {
  const columns: ColumnDef<FundingRecord, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'year',
        header: 'Год',
        cell: ({ getValue }) => <span className="font-medium">{getValue() as number}</span>,
      },
      {
        accessorKey: 'recordType',
        header: 'Выделено/Доведено',
        cell: ({ getValue }) => (
          <Badge variant={getValue() === 'ALLOCATED' ? 'default' : 'secondary'}>
            {RECORD_TYPE_LABELS[getValue() as FundingRecord['recordType']]}
          </Badge>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Всего',
        cell: ({ getValue }) => formatCurrency(getValue() as number),
      },
      {
        accessorKey: 'federalBudget',
        header: BUDGET_LABELS.federalBudget,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return v > 0 ? formatCurrency(v) : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'regionalBudget',
        header: BUDGET_LABELS.regionalBudget,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return v > 0 ? formatCurrency(v) : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'localBudget',
        header: BUDGET_LABELS.localBudget,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return v > 0 ? formatCurrency(v) : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'ownFunds',
        header: BUDGET_LABELS.ownFunds,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return v > 0 ? formatCurrency(v) : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'extraBudget',
        header: BUDGET_LABELS.extraBudget,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return v > 0 ? formatCurrency(v) : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Дата заполнения',
        cell: ({ getValue }) => formatDate(getValue() as string),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
                onClick={() => onDelete(row.original.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onEdit, onDelete, isDeleting]
  );

  return (
    <div className="overflow-x-auto">
      <DataTable columns={columns} data={records} />
    </div>
  );
}
