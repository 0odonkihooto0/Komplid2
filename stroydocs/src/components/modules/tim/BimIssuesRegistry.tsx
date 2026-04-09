'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import {
  useBimIssues,
  DEFECT_STATUS_LABELS,
  DEFECT_STATUS_VARIANTS,
  type BimIssueRow,
} from './useBimIssues';

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

// ─── Компонент ───────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
}

export function BimIssuesRegistry({ projectId }: Props) {
  const { issues, isLoading } = useBimIssues(projectId);

  const columns = useMemo<ColumnDef<BimIssueRow>[]>(
    () => [
      {
        id: 'index',
        header: '№',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.index + 1}</span>
        ),
      },
      {
        id: 'model',
        header: 'Модель',
        cell: ({ row }) => <span className="text-sm">{row.original.model.name}</span>,
      },
      {
        id: 'element',
        header: 'Элемент',
        cell: ({ row }) => {
          const el = row.original.element;
          return (
            <div>
              <p className="text-sm font-medium">{el.name ?? el.ifcType}</p>
              <p className="text-xs text-muted-foreground font-mono">{el.ifcGuid}</p>
            </div>
          );
        },
      },
      {
        id: 'category',
        header: 'Тип замечания',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.defect?.category ?? '—'}</span>
        ),
      },
      {
        id: 'author',
        header: 'Кем выдано',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.defect?.author?.name ?? '—'}</span>
        ),
      },
      {
        id: 'assignee',
        header: 'Ответственный',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.defect?.assignee?.name ?? '—'}</span>
        ),
      },
      {
        id: 'deadline',
        header: 'Срок устранения',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatDate(row.original.defect?.deadline)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Статус',
        cell: ({ row }) => {
          const status = row.original.defect?.status;
          if (!status) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <Badge variant={DEFECT_STATUS_VARIANTS[status] ?? 'outline'}>
              {DEFECT_STATUS_LABELS[status] ?? status}
            </Badge>
          );
        },
      },
    ],
    []
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Замечания к ЦИМ</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Дефекты строительного контроля, привязанные к элементам информационной модели
        </p>
      </div>
      <DataTable
        columns={columns}
        data={issues}
        searchPlaceholder="Поиск по замечаниям..."
        searchColumn="category"
      />
    </div>
  );
}
