'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/utils/format';
import { PROJECT_STATUS_LABELS } from '@/utils/constants';
import type { ProjectStatus } from '@prisma/client';

export interface ProjectItem {
  id: string;
  name: string;
  address: string | null;
  generalContractor: string | null;
  customer: string | null;
  status: ProjectStatus;
  createdAt: string;
  idReadinessPercent: number;
  _count: { contracts: number };
}

export function useProjectsTable() {
  const { data: projects = [], isLoading } = useQuery<ProjectItem[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const columns: ColumnDef<ProjectItem, unknown>[] = useMemo(() => [
    { accessorKey: 'name', header: 'Название' },
    {
      accessorKey: 'address',
      header: 'Адрес',
      cell: ({ getValue }) => getValue() || '—',
    },
    {
      accessorKey: 'generalContractor',
      header: 'Генподрядчик',
      cell: ({ getValue }) => getValue() || '—',
    },
    {
      accessorKey: 'customer',
      header: 'Заказчик',
      cell: ({ getValue }) => getValue() || '—',
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ getValue }) => PROJECT_STATUS_LABELS[getValue() as ProjectStatus] || getValue(),
    },
    {
      accessorKey: '_count.contracts',
      header: 'Договоры',
    },
    {
      accessorKey: 'createdAt',
      header: 'Создан',
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
  ], []);

  return { projects, columns, isLoading };
}
