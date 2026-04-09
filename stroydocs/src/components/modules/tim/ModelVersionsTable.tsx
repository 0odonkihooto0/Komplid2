'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { ModelStatusBadge } from './ModelStatusBadge';
import type { BimModelItem } from './useModels';
import { useDeleteModel } from './useModels';

// Метки стадий на русском
const STAGE_LABELS: Record<string, string> = {
  OTR: 'ОТР',
  PROJECT: 'Проект',
  WORKING: 'РД',
  CONSTRUCTION: 'АС',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

interface ModelVersionsTableProps {
  models: BimModelItem[];
  isLoading: boolean;
  projectId: string;
}

export function ModelVersionsTable({ models, isLoading, projectId }: ModelVersionsTableProps) {
  const router = useRouter();
  const deleteModel = useDeleteModel(projectId);

  const columns = useMemo<ColumnDef<BimModelItem>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Название',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.fileName}</span>
        </div>
      ),
    },
    {
      id: 'section',
      header: 'Раздел',
      cell: ({ row }) => row.original.section?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'stage',
      header: 'Стадия',
      cell: ({ row }) => row.original.stage
        ? <span className="text-sm">{STAGE_LABELS[row.original.stage] ?? row.original.stage}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'status',
      header: 'Статус',
      cell: ({ row }) => (
        <ModelStatusBadge
          status={row.original.status}
          errorMessage={row.original.errorMessage}
        />
      ),
    },
    {
      id: 'elements',
      header: 'Элементов',
      cell: ({ row }) => row.original.status === 'READY'
        ? row.original.elementCount.toLocaleString('ru-RU')
        : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'size',
      header: 'Размер',
      cell: ({ row }) => formatBytes(row.original.fileSize),
    },
    {
      id: 'uploadedBy',
      header: 'Загрузил',
      cell: ({ row }) => row.original.uploadedBy?.name ?? '—',
    },
    {
      id: 'createdAt',
      header: 'Дата',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Открыть модель"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/objects/${projectId}/tim/models/${row.original.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Удалить"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Удалить модель "${row.original.name}"?`)) {
                deleteModel.mutate(row.original.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [router, projectId, deleteModel]);

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>;
  }

  return (
    <DataTable
      columns={columns}
      data={models}
      searchPlaceholder="Поиск модели..."
      searchColumn="name"
    />
  );
}
