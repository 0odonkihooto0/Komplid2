'use client';

import { useMemo, useState } from 'react';
import { Eye, Layers, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/shared/DataTable';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { useMaterials } from './useMaterials';
import { useDeleteMaterial } from '@/hooks/useDeleteMaterial';
import { canDelete } from '@/utils/can-delete';
import { MaterialDocumentViewer } from './MaterialDocumentViewer';
import { MaterialBatchesTable } from '@/components/modules/input-control/MaterialBatchesTable';
import { CreateBatchDialog } from '@/components/modules/input-control/CreateBatchDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  projectId: string;
  contractId: string;
}

export function MaterialsTable({ projectId, contractId }: Props) {
  const { materials, columns, isLoading } = useMaterials(contractId);
  const { data: session } = useSession();
  const deleteMutation = useDeleteMaterial(projectId, contractId);
  const [viewDocsFor, setViewDocsFor] = useState<{ id: string; name: string } | null>(null);
  const [viewBatchesFor, setViewBatchesFor] = useState<{ id: string; name: string } | null>(null);
  const [createBatchFor, setCreateBatchFor] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');

  const columnsWithActions = useMemo(() => [
    ...columns,
    {
      id: 'actions',
      header: 'Действия',
      cell: ({ row }: { row: { original: { id: string; name: string } } }) => {
        // Material не имеет createdById — разрешаем удаление только ADMIN
        const showDelete = canDelete(
          session?.user.id ?? '',
          session?.user.role ?? 'WORKER',
          undefined
        );
        return (
          <div className="flex gap-1 flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Документы"
              onClick={(e) => {
                e.stopPropagation();
                setViewDocsFor({ id: row.original.id, name: row.original.name });
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Партии"
              onClick={(e) => {
                e.stopPropagation();
                setViewBatchesFor({ id: row.original.id, name: row.original.name });
              }}
            >
              <Layers className="h-4 w-4" />
            </Button>
            {showDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTargetId(row.original.id);
                  setDeleteTargetName(row.original.name);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить
              </Button>
            )}
          </div>
        );
      },
    },
  ], [columns, session]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <DataTable
        columns={columnsWithActions}
        data={materials}
        searchPlaceholder="Поиск по материалам..."
        searchColumn="name"
      />

      {/* Просмотр документов материала */}
      {viewDocsFor && (
        <MaterialDocumentViewer
          open={!!viewDocsFor}
          onOpenChange={() => setViewDocsFor(null)}
          contractId={contractId}
          materialId={viewDocsFor.id}
          materialName={viewDocsFor.name}
        />
      )}

      {/* Просмотр партий материала */}
      <Dialog open={!!viewBatchesFor} onOpenChange={() => setViewBatchesFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Партии: {viewBatchesFor?.name}</DialogTitle>
          </DialogHeader>
          {viewBatchesFor && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setCreateBatchFor(viewBatchesFor.id)}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  Добавить партию
                </Button>
              </div>
              <MaterialBatchesTable
                contractId={contractId}
                materialId={viewBatchesFor.id}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Создание партии */}
      {createBatchFor && (
        <CreateBatchDialog
          open={!!createBatchFor}
          onOpenChange={() => setCreateBatchFor(null)}
          contractId={contractId}
          materialId={createBatchFor}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(v) => { if (!v) setDeleteTargetId(null); }}
        entityName={deleteTargetName}
        warningText="Удаление возможно только если нет записей о списаниях."
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
