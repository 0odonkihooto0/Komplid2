'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { type ColumnDef } from '@tanstack/react-table';
import { formatFullName } from '@/utils/format';
import { WORKSPACE_ROLE_LABELS, MEMBER_STATUS_LABELS } from '@/utils/constants';
import type { WorkspaceRole, MemberStatus } from '@prisma/client';

export interface WorkspaceMemberRow {
  id: string;
  role: WorkspaceRole;
  status: MemberStatus;
  specialization: string | null;
  title: string | null;
  lastActiveAt: string | null;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
  };
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface MembersResponse {
  data: WorkspaceMemberRow[];
  meta: PaginationMeta;
}

export function useMembersTable() {
  const { data: session } = useSession();
  const wsId = session?.user.activeWorkspaceId;

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<WorkspaceRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchMembers = useCallback(async (): Promise<MembersResponse> => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter !== 'ALL') params.set('role', roleFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);

    const res = await fetch(`/api/workspaces/${wsId}/members?${params.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки');
    return { data: json.data, meta: json.meta };
  }, [wsId, search, roleFilter, statusFilter]);

  const { data, isLoading, refetch } = useQuery<MembersResponse>({
    queryKey: ['ws-members', wsId, search, roleFilter, statusFilter],
    queryFn: fetchMembers,
    enabled: !!wsId,
  });

  const members = data?.data ?? [];
  const meta = data?.meta;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // Колонки без колонки Actions — actions добавляет MembersTable снаружи
  const columns: ColumnDef<WorkspaceMemberRow>[] = useMemo(
    () => [
      {
        accessorFn: (row) => formatFullName(row.user),
        id: 'fullName',
        header: 'Участник',
        cell: ({ row }) => (
          `${formatFullName(row.original.user)}\n${row.original.user.email}`
        ),
      },
      {
        accessorKey: 'role',
        header: 'Роль',
        cell: ({ getValue }) => {
          const role = getValue() as WorkspaceRole;
          return WORKSPACE_ROLE_LABELS[role] ?? role;
        },
      },
      {
        accessorKey: 'specialization',
        header: 'Специализация',
        cell: ({ getValue }) => (getValue() as string | null) ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Статус',
        cell: ({ getValue }) => {
          const status = getValue() as MemberStatus;
          return MEMBER_STATUS_LABELS[status] ?? status;
        },
      },
      {
        accessorKey: 'lastActiveAt',
        header: 'Активность',
        cell: ({ getValue }) => {
          const val = getValue() as string | null;
          if (!val) return '—';
          return new Date(val).toLocaleDateString('ru-RU');
        },
      },
    ],
    []
  );

  return {
    members,
    columns,
    isLoading,
    meta,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    selectedIds,
    toggleSelect,
    clearSelection,
    refetch,
    wsId,
  };
}
