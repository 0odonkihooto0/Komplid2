'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/useToast';
import { WORKSPACE_ROLE_LABELS } from '@/utils/constants';
import { ResendInvitationButton } from '@/components/workspace/ResendInvitationButton';
import type { WorkspaceRole } from '@prisma/client';

interface Invitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function InvitationsPageContent() {
  const { data: session } = useSession();
  const wsId = session?.user.activeWorkspaceId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading } = useQuery<Invitation[]>({
    queryKey: ['ws-invitations', wsId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${wsId}/members/invitations`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!wsId,
  });

  const cancelMutation = useMutation({
    mutationFn: async (invId: string) => {
      const res = await fetch(
        `/api/workspaces/${wsId}/members/invitations/${invId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ws-invitations'] });
      toast({ title: 'Приглашение отменено' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Активные приглашения</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ожидают принятия от приглашённых участников
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && (!invitations || invitations.length === 0) && (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          Нет активных приглашений
        </div>
      )}

      {!isLoading && invitations && invitations.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Кем отправлено</TableHead>
                <TableHead>Истекает</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell>{WORKSPACE_ROLE_LABELS[inv.role]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inv.invitedBy.firstName} {inv.invitedBy.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true, locale: ru })}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <ResendInvitationButton invId={inv.id} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => cancelMutation.mutate(inv.id)}
                      disabled={cancelMutation.isPending}
                    >
                      Отменить
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
