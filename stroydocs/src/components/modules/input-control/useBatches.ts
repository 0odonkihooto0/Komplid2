'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';

interface MaterialBatch {
  id: string;
  batchNumber: string;
  quantity: number;
  arrivalDate: string;
  storageLocation: string | null;
  materialId: string;
  createdAt: string;
  _count: { inputControlRecords: number };
}

export function useBatches(contractId: string, materialId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: batches = [], isLoading } = useQuery<MaterialBatch[]>({
    queryKey: ['batches', contractId, materialId],
    queryFn: async () => {
      const res = await fetch(
        `/api/contracts/${contractId}/materials/${materialId}/batches`
      );
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      batchNumber: string;
      quantity: number;
      arrivalDate: string;
      storageLocation?: string;
    }) => {
      const res = await fetch(
        `/api/contracts/${contractId}/materials/${materialId}/batches`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches', contractId, materialId] });
      toast({ title: 'Партия добавлена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const columns: ColumnDef<MaterialBatch>[] = useMemo(() => [
    {
      accessorKey: 'batchNumber',
      header: 'Номер партии',
    },
    {
      accessorKey: 'quantity',
      header: 'Количество',
    },
    {
      accessorKey: 'arrivalDate',
      header: 'Дата поступления',
      cell: ({ row }) => formatDate(row.original.arrivalDate),
    },
    {
      accessorKey: 'storageLocation',
      header: 'Место хранения',
      cell: ({ row }) => row.original.storageLocation || '—',
    },
    {
      id: 'controlRecords',
      header: 'Записи ВК',
      cell: ({ row }) => row.original._count.inputControlRecords,
    },
  ], []);

  return { batches, columns, isLoading, createMutation };
}
