'use client';

import { useMemo, useRef, type ChangeEvent } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import {
  useBimIssues,
  useBcfExport,
  useBcfImport,
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
  const { exportBcf, isPending: exportPending } = useBcfExport(projectId);
  const { importBcf, isPending: importPending } = useBcfImport(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) importBcf(file);
    // Сбросить input чтобы можно было загрузить тот же файл повторно
    e.target.value = '';
  }

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Замечания к ЦИМ</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Дефекты строительного контроля, привязанные к элементам информационной модели
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportBcf}
            disabled={exportPending || isLoading || issues.length === 0}
            className="gap-2"
          >
            {exportPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Экспорт BCF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importPending}
            className="gap-2"
          >
            {importPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Импорт BCF
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".bcfzip,.bcf"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
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
