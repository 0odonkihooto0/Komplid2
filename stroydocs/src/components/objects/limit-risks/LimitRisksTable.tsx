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
import { BUDGET_LABELS, type LimitRisk } from './useLimitRisks';

interface LimitRisksTableProps {
  risks: LimitRisk[];
  onEdit: (risk: LimitRisk) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function LimitRisksTable({
  risks,
  onEdit,
  onDelete,
  isDeleting,
}: LimitRisksTableProps) {
  const columns: ColumnDef<LimitRisk, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'year',
        header: 'Год',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as number}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Статус',
        cell: ({ getValue }) => (
          <Badge variant="outline">{getValue() as string}</Badge>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Сумма',
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
        accessorKey: 'extraBudget',
        header: BUDGET_LABELS.extraBudget,
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
        accessorKey: 'riskReason',
        header: 'Причина риска',
        cell: ({ getValue }) => (
          <span
            className="block max-w-[200px] truncate"
            title={getValue() as string}
          >
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'resolutionProposal',
        header: 'Предложения по исключению',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          if (!v) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="block max-w-[200px] truncate" title={v}>
              {v}
            </span>
          );
        },
      },
      {
        id: 'contract',
        header: 'Контракт',
        cell: ({ row }) => {
          const c = row.original.contract;
          if (!c) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="block max-w-[180px] truncate" title={`${c.number} — ${c.name}`}>
              {c.number}
            </span>
          );
        },
      },
      {
        accessorKey: 'completionDate',
        header: 'Возможная дата завершения',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? formatDate(v) : <span className="text-muted-foreground">—</span>;
        },
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
      <DataTable columns={columns} data={risks} />
    </div>
  );
}
