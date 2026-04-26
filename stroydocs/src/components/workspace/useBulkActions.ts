'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/useToast';
import { type WorkspaceMemberRow } from './useMembersTable';
import type { WorkspaceRole } from '@prisma/client';

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useBulkActions(selectedIds: string[], clearSelection: () => void) {
  const { data: session } = useSession();
  const wsId = session?.user.activeWorkspaceId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkUpdateRole = useCallback(
    async (role: WorkspaceRole) => {
      if (!wsId || selectedIds.length === 0) return;
      try {
        await Promise.all(
          selectedIds.map((id) =>
            fetch(`/api/workspaces/${wsId}/members/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role }),
            }).then((r) => r.json())
          )
        );
        queryClient.invalidateQueries({ queryKey: ['ws-members'] });
        clearSelection();
        toast({ title: `Роль обновлена для ${selectedIds.length} участников` });
      } catch {
        toast({ title: 'Ошибка массового обновления ролей', variant: 'destructive' });
      }
    },
    [wsId, selectedIds, clearSelection, queryClient, toast]
  );

  const bulkDeactivate = useCallback(async () => {
    if (!wsId || selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/workspaces/${wsId}/members/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'DEACTIVATED' }),
          }).then((r) => r.json())
        )
      );
      queryClient.invalidateQueries({ queryKey: ['ws-members'] });
      clearSelection();
      toast({ title: `Деактивировано ${selectedIds.length} участников` });
    } catch {
      toast({ title: 'Ошибка массовой деактивации', variant: 'destructive' });
    }
  }, [wsId, selectedIds, clearSelection, queryClient, toast]);

  const exportCsv = useCallback(
    (members: WorkspaceMemberRow[]) => {
      const selected = members.filter((m) => selectedIds.includes(m.id));
      const rows = selected.map((m) => [
        m.user.email,
        `${m.user.lastName} ${m.user.firstName}`,
        m.role,
        m.status,
        m.specialization ?? '',
        m.title ?? '',
      ]);
      const header = ['Email', 'ФИО', 'Роль', 'Статус', 'Специализация', 'Должность'];
      const csv = [header, ...rows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      downloadCsv(csv, 'members.csv');
    },
    [selectedIds]
  );

  return { bulkUpdateRole, bulkDeactivate, exportCsv };
}
