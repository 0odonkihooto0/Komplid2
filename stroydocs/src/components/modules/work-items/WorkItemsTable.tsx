'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { useWorkItems } from './useWorkItems';
import { useDeleteWorkItem } from '@/hooks/useDeleteWorkItem';
import { canDelete } from '@/utils/can-delete';

interface Props {
  projectId: string;
  contractId: string;
}

export function WorkItemsTable({ projectId, contractId }: Props) {
  const { workItems, columns, isLoading } = useWorkItems(contractId);
  const { data: session } = useSession();
  const deleteMutation = useDeleteWorkItem(projectId, contractId);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');

  const columnsWithActions = useMemo(() => [
    ...columns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }: { row: { original: { id: string; name: string } } }) => {
        // WorkItem не имеет createdById — разрешаем удаление только ADMIN
        const showDelete = canDelete(
          session?.user.id ?? '',
          session?.user.role ?? 'WORKER',
          undefined
        );
        if (!showDelete) return null;
        return (
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
        );
      },
    },
  ], [columns, session]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <DataTable
        columns={columnsWithActions}
        data={workItems}
        searchPlaceholder="Поиск по работам..."
        searchColumn="name"
      />

      <DeleteConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(v) => { if (!v) setDeleteTargetId(null); }}
        entityName={deleteTargetName}
        warningText="Удаление возможно только если нет записей о работах."
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
