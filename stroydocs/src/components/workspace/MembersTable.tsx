'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { type WorkspaceMemberRow } from './useMembersTable';

interface MembersTableProps {
  members: WorkspaceMemberRow[];
  baseColumns: ColumnDef<WorkspaceMemberRow>[];
  isLoading: boolean;
  onChangeRole: (m: WorkspaceMemberRow) => void;
  onRemove: (m: WorkspaceMemberRow) => void;
}

export function MembersTable({
  members,
  baseColumns,
  isLoading,
  onChangeRole,
  onRemove,
}: MembersTableProps) {
  const columns: ColumnDef<WorkspaceMemberRow>[] = useMemo(
    () => [
      ...baseColumns,
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const member = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onChangeRole(member)}>
                  Изменить роль
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onRemove(member)}
                >
                  {member.status === 'SUSPENDED' ? 'Восстановить / Деактивировать' : 'Приостановить / Удалить'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [baseColumns, onChangeRole, onRemove]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={members}
      searchColumn="fullName"
      searchPlaceholder="Поиск по имени или email..."
    />
  );
}
