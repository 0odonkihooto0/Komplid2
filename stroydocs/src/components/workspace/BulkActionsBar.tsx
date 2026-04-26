'use client';

import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { WORKSPACE_ROLE_LABELS } from '@/utils/constants';
import { useBulkActions } from './useBulkActions';
import { type WorkspaceMemberRow } from './useMembersTable';
import type { WorkspaceRole } from '@prisma/client';

const SELECTABLE_ROLES: WorkspaceRole[] = ['ADMIN', 'MANAGER', 'ENGINEER', 'FOREMAN', 'WORKER'];

interface Props {
  selectedIds: string[];
  members: WorkspaceMemberRow[];
  clearSelection: () => void;
}

export function BulkActionsBar({ selectedIds, members, clearSelection }: Props) {
  const { bulkUpdateRole, bulkDeactivate, exportCsv } = useBulkActions(selectedIds, clearSelection);
  const [roleValue, setRoleValue] = useState('');

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
      <span className="text-sm font-medium">Выбрано: {selectedIds.length}</span>

      <Select
        value={roleValue || 'NONE'}
        onValueChange={(v) => {
          if (v === 'NONE') return;
          setRoleValue('');
          bulkUpdateRole(v as WorkspaceRole);
        }}
      >
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="Изменить роль" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE" disabled>Изменить роль</SelectItem>
          {SELECTABLE_ROLES.map((r) => (
            <SelectItem key={r} value={r}>{WORKSPACE_ROLE_LABELS[r]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">Деактивировать</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Деактивировать {selectedIds.length} участников?</AlertDialogTitle>
            <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDeactivate}>Деактивировать</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="outline" size="sm" onClick={() => exportCsv(members)}>
        <Download className="h-4 w-4 mr-1" />
        CSV
      </Button>

      <Button variant="ghost" size="sm" onClick={clearSelection}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
