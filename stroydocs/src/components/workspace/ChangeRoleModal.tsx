'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { PERMISSION_MATRIX } from '@/lib/permissions/matrix';
import { WORKSPACE_ROLE_LABELS } from '@/utils/constants';
import { type WorkspaceMemberRow } from './useMembersTable';
import type { WorkspaceRole } from '@prisma/client';

const SELECTABLE_ROLES: WorkspaceRole[] = ['ADMIN', 'MANAGER', 'ENGINEER', 'FOREMAN', 'WORKER', 'GUEST', 'CUSTOMER'];

interface Props {
  member: WorkspaceMemberRow | null;
  onClose: () => void;
}

export function ChangeRoleModal({ member, onClose }: Props) {
  const { data: session } = useSession();
  const wsId = session?.user.activeWorkspaceId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newRole, setNewRole] = useState<WorkspaceRole | null>(null);

  const lostPermissions = useMemo(() => {
    if (!member || !newRole) return [];
    const current = PERMISSION_MATRIX[member.role] ?? [];
    const next = PERMISSION_MATRIX[newRole] ?? [];
    const nextSet = new Set(next);
    return current.filter((p) => !nextSet.has(p));
  }, [member, newRole]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!member || !newRole) return;
      const res = await fetch(`/api/workspaces/${wsId}/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ws-members'] });
      toast({ title: 'Роль обновлена' });
      setNewRole(null);
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const handleClose = () => {
    setNewRole(null);
    onClose();
  };

  return (
    <Dialog open={!!member} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Изменить роль</DialogTitle>
          <DialogDescription>
            {member
              ? `${member.user.firstName} ${member.user.lastName} — сейчас: ${WORKSPACE_ROLE_LABELS[member.role]}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select
            value={newRole ?? 'NONE'}
            onValueChange={(v) => v !== 'NONE' && setNewRole(v as WorkspaceRole)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите новую роль" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE" disabled>Выберите роль</SelectItem>
              {SELECTABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r} disabled={r === member?.role}>
                  {WORKSPACE_ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {lostPermissions.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Будут потеряны права:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {lostPermissions.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!newRole || newRole === member?.role || mutation.isPending}
          >
            {mutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
