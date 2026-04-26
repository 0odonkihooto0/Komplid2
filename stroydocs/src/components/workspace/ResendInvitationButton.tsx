'use client';

import { useMutation } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

interface Props {
  invId: string;
  onResent?: (newInviteUrl: string) => void;
}

export function ResendInvitationButton({ invId, onResent }: Props) {
  const { data: session } = useSession();
  const wsId = session?.user.activeWorkspaceId;
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/workspaces/${wsId}/members/invitations/${invId}/resend`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { inviteUrl: string };
    },
    onSuccess: (data) => {
      toast({ title: 'Приглашение повторно отправлено' });
      onResent?.(data.inviteUrl);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      <RefreshCw className={`h-4 w-4 mr-1 ${mutation.isPending ? 'animate-spin' : ''}`} />
      {mutation.isPending ? 'Отправка...' : 'Повторить'}
    </Button>
  );
}
