'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Trash2, Settings2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { KsActDialog } from '@/components/modules/ks-acts/KsActDialog';
import { useExecutionDocs } from './useExecutionDocs';
import { useDeleteExecutionDoc } from '@/hooks/useDeleteExecutionDoc';
import { canDelete } from '@/utils/can-delete';
import { buildColumns, DEFAULT_VISIBLE_COLUMNS } from './execution-docs-columns';
import { ColumnVisibilityDialog } from './ColumnVisibilityDialog';
import { ExecutionDocsFilterBar } from './ExecutionDocsFilterBar';
import { ExportTableButton } from './ExportTableButton';
import type { ExecutionDocType, ExecutionDocStatus, IdCategory } from '@prisma/client';
import type { ExecutionDocRow } from './execution-docs-columns';
import type { ExecutionDocsFilters } from './useExecutionDocs';

const LS_KEY = 'execution-docs-visible-columns';

interface Props {
  contractId: string;
  projectId: string;
  /** Фильтр по пользовательской категории ИД (IdDocCategory.id) */
  categoryId?: string | null;
  /** Жёсткий фильтр по типам (задаётся вкладкой) */
  types?: ExecutionDocType[];
}

/** Читаем фильтры из URL query params */
function useFiltersFromUrl(): ExecutionDocsFilters {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const typesParam = searchParams.get('filterTypes');
    const statusParam = searchParams.get('filterStatus');
    return {
      types: typesParam ? (typesParam.split(',') as ExecutionDocType[]) : [],
      statuses: statusParam ? (statusParam.split(',') as ExecutionDocStatus[]) : [],
      idCategory: (searchParams.get('filterIdCategory') as IdCategory | null) ?? null,
      dateFrom: searchParams.get('filterDateFrom') ?? undefined,
      dateTo: searchParams.get('filterDateTo') ?? undefined,
      authorId: searchParams.get('filterAuthorId') ?? null,
    };
  }, [searchParams]);
}

export function ExecutionDocsTable({ contractId, projectId, categoryId, types }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const filters = useFiltersFromUrl();

  // Видимые колонки — инициализируем из localStorage
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMNS;
    try {
      const stored = localStorage.getItem(LS_KEY);
      return stored ? (JSON.parse(stored) as string[]) : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);

  const { docs, isLoading } = useExecutionDocs(contractId, categoryId, types, filters);
  const deleteMutation = useDeleteExecutionDoc(projectId, contractId);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');
  const [ksActOpenId, setKsActOpenId] = useState<string | null>(null);

  // Сохраняем выбор колонок в localStorage
  const handleSaveColumns = (ids: string[]) => {
    setVisibleColumns(ids);
    try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  };

  // Колонки + колонка удаления
  const columns = useMemo(() => {
    const base = buildColumns(visibleColumns);
    return [
      ...base,
      {
        id: 'delete-action',
        header: '' as string,
        cell: ({ row }: { row: { original: ExecutionDocRow } }) => {
          const doc = row.original;
          if (doc.status !== 'DRAFT') return null;
          const showDelete = canDelete(
            session?.user.id ?? '',
            session?.user.role ?? 'WORKER',
            doc.createdBy?.id
          );
          if (!showDelete) return null;
          return (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTargetId(doc.id);
                setDeleteTargetName(`${doc.number}${doc.title ? ` — ${doc.title}` : ''}`);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Удалить
            </Button>
          );
        },
      },
    ];
  }, [visibleColumns, session]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      {/* Тулбар: фильтры + настройки колонок + экспорт */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <ExecutionDocsFilterBar filters={filters} />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setColumnDialogOpen(true)}
        >
          <Settings2 className="h-4 w-4" />
          Колонки
        </Button>
        <ExportTableButton
          contractId={contractId}
          visibleColumns={visibleColumns}
          filters={filters}
        />
      </div>

      <DataTable
        columns={columns}
        data={docs}
        searchPlaceholder="Поиск по документам..."
        searchColumn="title"
        onRowClick={(doc) => {
          if (doc.type === 'KS_11' || doc.type === 'KS_14') {
            setKsActOpenId(doc.id);
          } else {
            router.push(`/objects/${projectId}/contracts/${contractId}/docs/${doc.id}`);
          }
        }}
      />

      <ColumnVisibilityDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        visibleColumns={visibleColumns}
        onSave={handleSaveColumns}
      />

      {ksActOpenId && (
        <KsActDialog
          open={!!ksActOpenId}
          onOpenChange={(v) => { if (!v) setKsActOpenId(null); }}
          actId={ksActOpenId}
          objectId={projectId}
          contractId={contractId}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(v) => { if (!v) setDeleteTargetId(null); }}
        entityName={deleteTargetName}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId, {
              onSuccess: () => setDeleteTargetId(null),
            });
          }
        }}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
