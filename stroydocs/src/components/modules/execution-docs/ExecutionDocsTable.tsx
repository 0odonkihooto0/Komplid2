'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { useExecutionDocs } from './useExecutionDocs';
import { useDeleteExecutionDoc } from '@/hooks/useDeleteExecutionDoc';
import { canDelete } from '@/utils/can-delete';
import { ID_CATEGORY_LABELS } from '@/utils/constants';
import type { ExecutionDocStatus, IdCategory } from '@prisma/client';

interface Props {
  contractId: string;
  projectId: string;
}

interface DocRow {
  id: string;
  number: string;
  title: string;
  status: ExecutionDocStatus;
  createdBy: { id: string; firstName: string; lastName: string };
}

export function ExecutionDocsTable({ contractId, projectId }: Props) {
  const { docs, columns, isLoading } = useExecutionDocs(contractId);
  const { data: session } = useSession();
  const router = useRouter();
  const deleteMutation = useDeleteExecutionDoc(projectId, contractId);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Фильтрация по категории ИД (ГОСТ Р 70108-2025)
  const filteredDocs = useMemo(() => {
    if (categoryFilter === 'all') return docs;
    return docs.filter((d) => d.idCategory === categoryFilter);
  }, [docs, categoryFilter]);

  const columnsWithActions = useMemo(() => [
    ...columns,
    {
      id: 'delete-action',
      header: '',
      cell: ({ row }: { row: { original: DocRow } }) => {
        const doc = row.original;
        // Кнопка «Удалить» только для черновиков и только для создателя или ADMIN
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
  ], [columns, session]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Группа ИД:</span>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Все группы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все группы</SelectItem>
            {(Object.entries(ID_CATEGORY_LABELS) as [IdCategory, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columnsWithActions}
        data={filteredDocs}
        searchPlaceholder="Поиск по документам..."
        searchColumn="title"
        onRowClick={(doc) =>
          router.push(`/objects/${projectId}/contracts/${contractId}/docs/${doc.id}`)
        }
      />

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
