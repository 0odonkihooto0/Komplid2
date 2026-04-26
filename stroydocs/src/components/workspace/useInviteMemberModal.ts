'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/useToast';
import {
  inviteMemberSchema,
  inviteGuestSchema,
  type InviteMemberInput,
  type InviteGuestInput,
} from '@/lib/validations/workspace-member';

export function useInviteMemberModal(onClose: () => void) {
  const { data: session } = useSession();
  const wsId = session?.user.activeWorkspaceId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const teamForm = useForm({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'WORKER' as InviteMemberInput['role'], specialization: '', personalMessage: '' },
  });

  const guestForm = useForm({
    resolver: zodResolver(inviteGuestSchema),
    defaultValues: {
      email: '',
      role: 'GUEST' as InviteGuestInput['role'],
      guestScope: { permissions: { canViewCosts: false, canSignActs: false } },
    },
  });

  const teamMutation = useMutation({
    mutationFn: async (data: InviteMemberInput) => {
      const res = await fetch(`/api/workspaces/${wsId}/members/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { inviteUrl: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ws-members'] });
      queryClient.invalidateQueries({ queryKey: ['ws-invitations'] });
      setInviteUrl(data.inviteUrl);
      toast({ title: 'Приглашение отправлено' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const guestMutation = useMutation({
    mutationFn: async (data: InviteGuestInput) => {
      const res = await fetch(`/api/workspaces/${wsId}/members/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { inviteUrl: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ws-members'] });
      queryClient.invalidateQueries({ queryKey: ['ws-invitations'] });
      setInviteUrl(data.inviteUrl);
      toast({ title: 'Приглашение для гостя отправлено' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const handleClose = () => {
    setInviteUrl(null);
    teamForm.reset();
    guestForm.reset();
    onClose();
  };

  return {
    teamForm,
    guestForm,
    teamMutation,
    guestMutation,
    inviteUrl,
    handleClose,
  };
}
