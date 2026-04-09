'use client';

import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportListItem } from './useReportsList';

// ─── Константы статусов ───────────────────────────────────────────────────────

const REPORT_STATUS_LABEL: Record<ReportListItem['status'], string> = {
  DRAFT: 'Черновик',
  GENERATED: 'Сформирован',
  SIGNED: 'Подписан',
};

const REPORT_STATUS_CLASS: Record<ReportListItem['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  GENERATED: 'bg-blue-100 text-blue-700',
  SIGNED: 'bg-green-100 text-green-700',
};

// ─── Форматирование дат ───────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Компонент ────────────────────────────────────────────────────────────────

interface ReportsTableProps {
  objectId: string;
  reports: ReportListItem[];
  isLoading: boolean;
}

export function ReportsTable({ objectId, reports, isLoading }: ReportsTableProps) {
  const router = useRouter();

  const columns: ColumnDef<ReportListItem>[] = [
    {
      accessorKey: 'number',
      header: '№',
      cell: ({ row }) => (
        <span className="font-medium text-sm text-muted-foreground">
          {row.original.number}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Наименование',
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Категория',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.category?.name ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'periodStart',
      header: 'Начало периода',
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.original.periodStart)}</span>
      ),
    },
    {
      accessorKey: 'periodEnd',
      header: 'Конец периода',
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.original.periodEnd)}</span>
      ),
    },
    {
      accessorKey: 'author',
      header: 'Автор',
      cell: ({ row }) => {
        const a = row.original.author;
        return (
          <span className="text-sm text-muted-foreground">
            {a ? `${a.lastName} ${a.firstName}` : '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Создан',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge className={`text-xs font-normal ${REPORT_STATUS_CLASS[s]}`} variant="outline">
            {REPORT_STATUS_LABEL[s]}
          </Badge>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={reports}
      searchPlaceholder="Поиск по названию..."
      searchColumn="name"
      onRowClick={(row) =>
        router.push(`/objects/${objectId}/reports/list/${row.id}`)
      }
    />
  );
}
