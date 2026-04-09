'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';
import { INPUT_CONTROL_RESULT_LABELS } from '@/utils/constants';
import type { InputControlResult, MeasurementUnit } from '@prisma/client';

interface InputControlRecordItem {
  id: string;
  date: string;
  result: InputControlResult;
  notes: string | null;
  batch: {
    id: string;
    batchNumber: string;
    material: { id: string; name: string; unit: MeasurementUnit };
  };
  inspector: { id: string; firstName: string; lastName: string; position: string | null };
  _count: { acts: number };
  createdAt: string;
}

export function useInputControl(contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: records = [], isLoading } = useQuery<InputControlRecordItem[]>({
    queryKey: ['input-control', contractId],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}/input-control`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      batchId: string;
      date: string;
      result: string;
      notes?: string;
    }) => {
      const res = await fetch(`/api/contracts/${contractId}/input-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['input-control', contractId] });
      toast({ title: 'Запись ЖВК создана' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await fetch(`/api/contracts/${contractId}/input-control/${recordId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['input-control', contractId] });
      toast({ title: 'Запись ЖВК удалена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const columns: ColumnDef<InputControlRecordItem>[] = useMemo(() => [
    {
      accessorKey: 'date',
      header: 'Дата проверки',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      id: 'material',
      header: 'Материал',
      cell: ({ row }) => row.original.batch.material.name,
    },
    {
      id: 'batchNumber',
      header: 'Партия',
      cell: ({ row }) => row.original.batch.batchNumber,
    },
    {
      accessorKey: 'result',
      header: 'Результат',
      cell: ({ row }) => {
        const result = row.original.result;
        const colorMap: Record<string, string> = {
          CONFORMING: 'text-green-700 bg-green-50',
          NON_CONFORMING: 'text-red-700 bg-red-50',
          CONDITIONAL: 'text-yellow-700 bg-yellow-50',
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colorMap[result] || ''}`}>
            {INPUT_CONTROL_RESULT_LABELS[result]}
          </span>
        );
      },
    },
    {
      id: 'inspector',
      header: 'Инспектор',
      cell: ({ row }) => {
        const i = row.original.inspector;
        return `${i.lastName} ${i.firstName}`;
      },
    },
    {
      id: 'acts',
      header: 'Акты',
      cell: ({ row }) => row.original._count.acts || '—',
    },
  ], []);

  return { records, columns, isLoading, createMutation, deleteMutation };
}
