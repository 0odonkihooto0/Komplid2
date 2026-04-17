'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Building2, MoreHorizontal, Eye, Download, Star, Upload, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/shared/DataTable';
import type { BimModelItem } from './useModels';
import {
  useDeleteModel, useMakeCurrent, useDownloadModel,
} from './useModels';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface ModelVersionsTableProps {
  models: BimModelItem[];
  isLoading: boolean;
  projectId: string;
  /** Открыть диалог загрузки (в т.ч. пустое состояние) */
  onUploadClick: () => void;
  /** Открыть диалог загрузки новой версии конкретной модели (пред-заполнить имя) */
  onUploadNewVersion: (model: BimModelItem) => void;
}

export function ModelVersionsTable({
  models, isLoading, projectId, onUploadClick, onUploadNewVersion,
}: ModelVersionsTableProps) {
  const router = useRouter();
  const deleteModel = useDeleteModel(projectId);
  const makeCurrent = useMakeCurrent(projectId);
  const downloadModel = useDownloadModel(projectId);

  // Вычисляем «Версию до»: для каждой модели — createdAt следующей более свежей
  // записи того же раздела. Для самой свежей — null.
  const validToBySection = useMemo(() => {
    const bySection = new Map<string, BimModelItem[]>();
    for (const m of models) {
      const key = m.section?.id ?? '__nosection__';
      const arr = bySection.get(key) ?? [];
      arr.push(m);
      bySection.set(key, arr);
    }
    const result = new Map<string, string | null>();
    for (const arr of Array.from(bySection.values())) {
      // Сортируем по createdAt ASC: следующая по индексу = более свежая версия
      const sorted = [...arr].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      for (let i = 0; i < sorted.length; i += 1) {
        const next = sorted[i + 1];
        result.set(sorted[i].id, next ? next.createdAt : null);
      }
    }
    return result;
  }, [models]);

  const columns = useMemo<ColumnDef<BimModelItem>[]>(() => [
    {
      id: 'index',
      header: '№',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.index + 1}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Наименование',
      cell: ({ row }) => (
        <div className="flex items-start gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm truncate">{row.original.name}</span>
            <span className="text-xs text-muted-foreground truncate">{row.original.fileName}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'isCurrent',
      header: 'Актуальная',
      cell: ({ row }) => (
        row.original.isCurrent
          ? <Badge variant="success">Да</Badge>
          : <Badge variant="secondary">Нет</Badge>
      ),
    },
    {
      accessorKey: 'comment',
      header: 'Комментарий',
      cell: ({ row }) => (
        row.original.comment
          ? <span className="text-sm line-clamp-2">{row.original.comment}</span>
          : <span className="text-muted-foreground">—</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Версия от',
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: 'validTo',
      header: 'Версия до',
      cell: ({ row }) => {
        const validTo = validToBySection.get(row.original.id);
        return validTo
          ? <span className="text-sm">{formatDate(validTo)}</span>
          : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: 'uploadedBy',
      header: 'Автор',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.uploadedBy?.name ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const model = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={() => router.push(`/objects/${projectId}/tim/models/${model.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Открыть вьюер
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadModel.mutate(model.id)}>
                <Download className="h-4 w-4 mr-2" />
                Скачать IFC
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={model.isCurrent}
                onClick={() => makeCurrent.mutate(model.id)}
              >
                <Star className="h-4 w-4 mr-2" />
                Сделать актуальной
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUploadNewVersion(model)}>
                <Upload className="h-4 w-4 mr-2" />
                Загрузить новую версию
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (confirm(`Удалить модель "${model.name}"?`)) {
                    deleteModel.mutate(model.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [router, projectId, deleteModel, makeCurrent, downloadModel, validToBySection, onUploadNewVersion]);

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>;
  }

  // Пустое состояние
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 border rounded-md">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Нет загруженных версий</p>
        <Button onClick={onUploadClick}>Загрузить первую версию</Button>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={models}
      searchPlaceholder="Поиск версии..."
      searchColumn="name"
      getRowClassName={(row) => (row.isCurrent ? 'bg-blue-50 hover:bg-blue-100' : undefined)}
    />
  );
}
