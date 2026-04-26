'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { formatFullName } from '@/utils/format';
import { type WorkspaceMemberRow } from './useMembersTable';

type Action = 'SUSPENDED' | 'DEACTIVATED';
interface OtherMember { id: string; user: { firstName: string; lastName: string } }
interface Props { member: WorkspaceMemberRow | null; onClose: () => void }

export function RemoveMemberModal({ member, onClose }: Props) {
  const { data: session } = useSession();
  const wsId = session?.user.activeWorkspaceId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Action>('SUSPENDED');
  const [reason, setReason] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const isOwner = member?.role === 'OWNER';

  const { data: otherMembers } = useQuery<OtherMember[]>({
    queryKey: ['ws-members-active', wsId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${wsId}/members?status=ACTIVE`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.filter((m: WorkspaceMemberRow) => m.id !== member?.id);
    },
    enabled: !!wsId && !!member && isOwner,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!member) return;
      const body: Record<string, string> = { status: action };
      if (reason) body.deactivationReason = reason;
      if (isOwner && transferTo) body.transferOwnershipTo = transferTo;
      const res = await fetch(`/api/workspaces/${wsId}/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ws-members'] });
      toast({ title: action === 'SUSPENDED' ? 'Участник приостановлен' : 'Участник деактивирован' });
      handleClose();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const handleClose = () => { setAction('SUSPENDED'); setReason(''); setTransferTo(''); onClose(); };
  const canSubmit = !isOwner || (action === 'DEACTIVATED' ? !!transferTo : true);

  return (
    <Dialog open={!!member} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Изменить статус участника</DialogTitle>
          <DialogDescription>{member ? formatFullName(member.user) : ''}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <RadioGroup value={action} onValueChange={(v) => setAction(v as Action)} className="space-y-3">
            {([
              ['SUSPENDED', 'Приостановить', 'Временно теряет доступ. Можно восстановить.'],
              ['DEACTIVATED', 'Деактивировать', 'Полностью удаляется из команды. Необратимо.'],
            ] as const).map(([val, title, desc]) => (
              <div key={val} className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/40">
                <RadioGroupItem value={val} id={`action-${val}`} className="mt-0.5" />
                <div>
                  <label htmlFor={`action-${val}`} className="font-medium text-sm cursor-pointer">{title}</label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
          {isOwner && action === 'DEACTIVATED' && (
            <div className="space-y-2">
              <Label>Передать права владельца</Label>
              <Select value={transferTo || 'NONE'} onValueChange={(v) => setTransferTo(v === 'NONE' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Выберите участника" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" disabled>Выберите участника</SelectItem>
                  {(otherMembers ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{formatFullName(m.user)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Причина (необязательно)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Укажите причину..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Применение...' : 'Применить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
