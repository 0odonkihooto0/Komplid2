'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/utils/format';
import { CONTRACT_STATUS_LABELS } from '@/utils/constants';
import type { ContractType, ContractStatus } from '@prisma/client';

export interface ContractItem {
  id: string;
  number: string;
  name: string;
  type: ContractType;
  contractKindId: string | null;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  parentId: string | null;
  _count: { subContracts: number };
}

export function useContractsTable(projectId: string) {
  const { data: contracts = [], isLoading } = useQuery<ContractItem[]>({
    queryKey: ['contracts', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/contracts`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const columns: ColumnDef<ContractItem, unknown>[] = useMemo(() => [
    { accessorKey: 'number', header: 'Номер' },
    { accessorKey: 'name', header: 'Наименование' },
    {
      accessorKey: 'type',
      header: 'Тип',
      cell: ({ getValue }) => getValue() === 'MAIN' ? 'Основной' : 'Субдоговор',
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ getValue }) => CONTRACT_STATUS_LABELS[getValue() as ContractStatus],
    },
    {
      accessorKey: 'startDate',
      header: 'Начало',
      cell: ({ getValue }) => getValue() ? formatDate(getValue() as string) : '—',
    },
    {
      accessorKey: 'endDate',
      header: 'Окончание',
      cell: ({ getValue }) => getValue() ? formatDate(getValue() as string) : '—',
    },
    {
      accessorKey: '_count.subContracts',
      header: 'Субдоговоры',
    },
  ], []);

  return { contracts, columns, isLoading };
}
