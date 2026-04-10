'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trash2, Plus, Calculator } from 'lucide-react';
import { formatDate, formatCurrency } from '@/utils/format';
import { useLocalEstimates } from './useLocalEstimates';
import { LinkEstimateDialog } from './LinkEstimateDialog';
import type { LinkedEstimateItem } from './useLocalEstimates';

/** Метки типов версий смет */
const VERSION_TYPE_LABELS: Record<string, string> = {
  BASELINE: 'Базовая',
  ACTUAL: 'Актуальная',
  CORRECTIVE: 'Корректировочная',
};

interface Props {
  projectId: string;
  contractId: string;
  linkEstimateOpen: boolean;
  setLinkEstimateOpen: (v: boolean) => void;
}

export function LocalEstimatesTab({
  projectId,
  contractId,
  linkEstimateOpen,
  setLinkEstimateOpen,
}: Props) {
  const { estimates, isLoading, isError, unlinkMutation } = useLocalEstimates(
    projectId,
    contractId
  );

  const columns: ColumnDef<LinkedEstimateItem>[] = [
    {
      accessorKey: 'estimateVersion.name',
      header: 'Название',
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.estimateVersion.name}</span>
      ),
    },
    {
      accessorKey: 'estimateVersion.versionType',
      header: 'Тип',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs">
          {VERSION_TYPE_LABELS[row.original.estimateVersion.versionType] ??
            row.original.estimateVersion.versionType}
        </Badge>
      ),
    },
    {
      accessorKey: 'estimateVersion.isBaseline',
      header: 'Базовая',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.estimateVersion.isBaseline ? '✓' : '—'}</span>
      ),
    },
    {
      accessorKey: 'estimateVersion.isActual',
      header: 'Актуальная',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.estimateVersion.isActual ? '✓' : '—'}</span>
      ),
    },
    {
      accessorKey: 'estimateVersion.totalAmount',
      header: 'Итог',
      cell: ({ row }) =>
        row.original.estimateVersion.totalAmount !== null ? (
          <span className="text-sm">
            {formatCurrency(row.original.estimateVersion.totalAmount)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'estimateVersion.createdAt',
      header: 'Дата',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.estimateVersion.createdAt)}
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
          aria-label="Отвязать смету"
          onClick={() => unlinkMutation.mutate(row.original.id)}
          disabled={unlinkMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  /** При ошибке загрузки — показываем заглушку (модуль Сметы не подключён) */
  if (isError) {
    return (
      <EmptyState
        icon={<Calculator className="h-12 w-12" />}
        title="Доступно после подключения модуля Сметы"
        description="Привязка смет к договору доступна при наличии модуля Сметы"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Заголовок и кнопка добавления */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Привязанные сметы</h3>
        <Button size="sm" onClick={() => setLinkEstimateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {/* Таблица или пустое состояние */}
      {!isLoading && estimates.length === 0 ? (
        <EmptyState
          icon={<Calculator className="h-12 w-12" />}
          title="Нет привязанных смет"
          description="Привяжите версию сметы к этому договору"
        />
      ) : (
        <DataTable columns={columns} data={estimates} />
      )}

      <LinkEstimateDialog
        open={linkEstimateOpen}
        onOpenChange={setLinkEstimateOpen}
        projectId={projectId}
        contractId={contractId}
      />
    </div>
  );
}
