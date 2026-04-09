'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { formatFullName, formatRole } from '@/utils/format';
import type { UserRole } from '@prisma/client';

export interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  phone: string | null;
  position: string | null;
  role: UserRole;
  isActive: boolean;
}

export function useEmployeeTable() {
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const columns: ColumnDef<Employee, unknown>[] = useMemo(() => [
    {
      accessorFn: (row) => formatFullName(row),
      id: 'fullName',
      header: 'ФИО',
    },
    {
      accessorKey: 'position',
      header: 'Должность',
      cell: ({ getValue }) => getValue() || '—',
    },
    {
      accessorKey: 'role',
      header: 'Роль',
      cell: ({ getValue }) => formatRole(getValue() as UserRole),
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'phone',
      header: 'Телефон',
      cell: ({ getValue }) => getValue() || '—',
    },
    {
      accessorKey: 'isActive',
      header: 'Статус',
      cell: ({ getValue }) => (
        getValue()
          ? 'Активен'
          : 'Неактивен'
      ),
    },
  ], []);

  return { employees, columns, isLoading };
}
