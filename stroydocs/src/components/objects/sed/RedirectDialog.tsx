'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
}

interface RedirectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  docId: string;
  workflowId: string;
  onRedirected: () => void;
}

export function RedirectDialog({ open, onOpenChange, objectId, docId, workflowId, onRedirected }: RedirectDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [targetUserId, setTargetUserId] = useState('');
  const [comment, setComment] = useState('');

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['org-employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
  });

  const redirectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/sed/${docId}/workflows/${workflowId}/redirect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId, comment: comment || undefined }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка перенаправления');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-detail', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['sed-card', docId] });
      toast({ title: 'ДО перенаправлен' });
      onRedirected();
      handleClose();
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const handleClose = () => {
    setTargetUserId('');
    setComment('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Перенаправить ДО</DialogTitle>
          <DialogDescription>Выберите сотрудника, которому перенаправить документооборот</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Перенаправить кому</Label>
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.lastName} {e.firstName}{e.position ? ` — ${e.position}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Комментарий (необязательно)</Label>
            <Textarea
              placeholder="Причина перенаправления..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          <Button
            onClick={() => redirectMutation.mutate()}
            disabled={!targetUserId || redirectMutation.isPending}
          >
            Перенаправить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
