'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/shared/DataTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  type MaterialRequestItem,
  type MaterialRequestStatus,
  STATUS_LABELS,
} from './usePlanning';
import { useRequestsView } from './useRequestsView';

// ─── Цвета статусов ──────────────────────────────────────────────────────────

const STATUS_CLASS: Record<MaterialRequestStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-green-700 text-white',
  CANCELLED: 'bg-red-100 text-red-700',
};

// ─── Колонки таблицы ─────────────────────────────────────────────────────────

const columns: ColumnDef<MaterialRequestItem>[] = [
  {
    accessorKey: 'number',
    header: 'Номер',
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.number}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const s = row.original.status;
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            STATUS_CLASS[s]
          )}
        >
          {STATUS_LABELS[s]}
        </span>
      );
    },
  },
  {
    id: 'supplier',
    header: 'Поставщик',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.supplierOrg?.name ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'deliveryDate',
    header: 'Срок поставки',
    cell: ({ row }) => {
      const d = row.original.deliveryDate;
      return (
        <span className="text-sm text-muted-foreground">
          {d ? format(new Date(d), 'd MMM yyyy', { locale: ru }) : '—'}
        </span>
      );
    },
  },
  {
    id: 'items',
    header: 'Позиций',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original._count?.items ?? 0}
      </span>
    ),
  },
  {
    id: 'sum',
    header: 'Сумма',
    cell: () => (
      <span className="text-sm text-muted-foreground">—</span>
    ),
  },
  {
    id: 'processed',
    header: 'Обработана',
    cell: ({ row }) =>
      row.original.hasUnprocessedItems ? (
        <span title="Есть позиции без статуса" className="text-base">⚠️</span>
      ) : (
        <span title="Все позиции обработаны" className="text-base">✅</span>
      ),
  },
  {
    id: 'approvalStatus',
    header: 'Согласование',
    cell: ({ row }) => {
      const status = row.original.approvalStatus;
      if (!status) {
        return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">Не начато</span>;
      }
      const APPROVAL_CLASS: Record<string, string> = {
        PENDING:  'bg-blue-100 text-blue-700',
        APPROVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-700',
        RESET:    'bg-gray-100 text-gray-600',
      };
      const APPROVAL_LABEL: Record<string, string> = {
        PENDING:  'В процессе',
        APPROVED: 'Согласовано',
        REJECTED: 'Отклонено',
        RESET:    'Сброшено',
      };
      return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', APPROVAL_CLASS[status] ?? 'bg-gray-100 text-gray-600')}>
          {APPROVAL_LABEL[status] ?? status}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Создана',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.createdAt), 'd MMM yyyy', { locale: ru })}
      </span>
    ),
  },
];

// ─── Компонент ───────────────────────────────────────────────────────────────

interface RequestsViewProps {
  objectId: string;
}

export function RequestsView({ objectId }: RequestsViewProps) {
  const vm = useRequestsView(objectId);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Реестр заявок на материалы</h2>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Статус</Label>
          <Select
            value={vm.statusFilter || 'ALL'}
            onValueChange={(v) => vm.setStatusFilter(v === 'ALL' ? '' : v as MaterialRequestStatus | '')}
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все статусы</SelectItem>
              {(Object.keys(STATUS_LABELS) as MaterialRequestStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">С</Label>
          <Input
            type="date"
            className="h-9 w-36"
            value={vm.dateFrom}
            onChange={(e) => vm.setDateFrom(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">По</Label>
          <Input
            type="date"
            className="h-9 w-36"
            value={vm.dateTo}
            onChange={(e) => vm.setDateTo(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Согласование</Label>
          <Select
            value={vm.approvalStatusFilter || 'ALL'}
            onValueChange={(v) => vm.setApprovalStatusFilter(v === 'ALL' ? '' : v)}
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все</SelectItem>
              <SelectItem value="none">Не начато</SelectItem>
              <SelectItem value="PENDING">В процессе</SelectItem>
              <SelectItem value="APPROVED">Согласовано</SelectItem>
              <SelectItem value="REJECTED">Отклонено</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {vm.hasFilters && (
          <Button variant="ghost" size="sm" onClick={vm.handleReset} className="h-9 self-end">
            Сбросить
          </Button>
        )}
      </div>

      {/* Таблица */}
      {vm.isLoading ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
          Загрузка...
        </div>
      ) : vm.requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Заявок не найдено. Создайте ЛРВ на вкладке «Планирование».
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/objects/${objectId}/resources/planning`}
          >
            Перейти к планированию
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={vm.requests}
          searchPlaceholder="Поиск по номеру..."
          searchColumn="number"
          onRowClick={vm.handleRowClick}
        />
      )}
    </div>
  );
}
