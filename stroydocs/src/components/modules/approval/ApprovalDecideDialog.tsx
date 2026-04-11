'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision: 'APPROVED' | 'REJECTED';
  isPending: boolean;
  onConfirm: (comment?: string) => void;
}

export function ApprovalDecideDialog({ open, onOpenChange, decision, isPending, onConfirm }: Props) {
  const [comment, setComment] = useState('');

  const isApprove = decision === 'APPROVED';
  const title = isApprove ? 'Согласовать' : 'Отклонить';
  const placeholder = isApprove
    ? 'Комментарий (необязательно)'
    : 'Причина отклонения (необязательно)';

  const handleConfirm = () => {
    onConfirm(comment.trim() || undefined);
    setComment('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setComment('');
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decide-comment">Комментарий</Label>
          <Textarea
            id="decide-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={placeholder}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Отмена
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Обработка...' : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
