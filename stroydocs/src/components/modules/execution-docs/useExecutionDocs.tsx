'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useToast } from '@/hooks/useToast';
import { EXECUTION_DOC_TYPE_LABELS, EXECUTION_DOC_STATUS_LABELS, ID_CATEGORY_LABELS, ID_CATEGORY_COLORS } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import type { ExecutionDocType, ExecutionDocStatus, IdCategory } from '@prisma/client';

interface ExecutionDoc {
  id: string;
  type: ExecutionDocType;
  status: ExecutionDocStatus;
  number: string;
  title: string;
  s3Key: string | null;
  fileName: string | null;
  generatedAt: string | null;
  createdAt: string;
  idCategory: IdCategory | null;
  createdBy: { id: string; firstName: string; lastName: string };
  _count: { signatures: number; comments: number };
}

export function useExecutionDocs(contractId: string, categoryId?: string | null, types?: ExecutionDocType[]) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: docs = [], isLoading } = useQuery<ExecutionDoc[]>({
    queryKey: ['execution-docs', contractId, categoryId ?? null, types],
    queryFn: async () => {
      const url = new URL(`/api/contracts/${contractId}/execution-docs`, window.location.origin);
      if (categoryId) url.searchParams.set('categoryId', categoryId);
      if (types && types.length > 0) url.searchParams.set('types', types.join(','));
      const res = await fetch(url.toString());
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { type: ExecutionDocType; workRecordId?: string; title?: string }) => {
      const res = await fetch(`/api/contracts/${contractId}/execution-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Документ создан' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ projectId, docId }: { projectId: string; docId: string }) => {
      const res = await fetch(
        `/api/objects/${projectId}/contracts/${contractId}/execution-docs/${docId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Документ удалён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const columns: ColumnDef<ExecutionDoc>[] = useMemo(() => [
    {
      accessorKey: 'number',
      header: '№',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.number}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Тип',
      cell: ({ row }) => EXECUTION_DOC_TYPE_LABELS[row.original.type],
    },
    {
      accessorKey: 'idCategory',
      header: 'Группа ИД',
      cell: ({ row }) => {
        const cat = row.original.idCategory;
        if (!cat) return '—';
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ID_CATEGORY_COLORS[cat]}`}>
            {ID_CATEGORY_LABELS[cat]}
          </span>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Наименование',
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => {
        const status = row.original.status;
        const colorMap: Record<ExecutionDocStatus, string> = {
          DRAFT: 'bg-gray-100 text-gray-800',
          IN_REVIEW: 'bg-yellow-100 text-yellow-800',
          SIGNED: 'bg-green-100 text-green-800',
          REJECTED: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status]}`}>
            {EXECUTION_DOC_STATUS_LABELS[status]}
          </span>
        );
      },
    },
    {
      accessorKey: 'generatedAt',
      header: 'PDF',
      cell: ({ row }) => row.original.generatedAt ? formatDate(row.original.generatedAt) : '—',
    },
    {
      id: 'comments',
      header: 'Замечания',
      cell: ({ row }) => {
        const count = row.original._count.comments;
        return count > 0 ? count : '—';
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Создан',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ], []);

  return { docs, columns, isLoading, createMutation, deleteMutation };
}
