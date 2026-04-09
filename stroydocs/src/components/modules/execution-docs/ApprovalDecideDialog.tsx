'use client';

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useApproval } from './useApproval';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
  docId: string;
  currentRole: string;
}

/** Диалог принятия решения по шагу согласования */
export function ApprovalDecideDialog({
  open,
  onOpenChange,
  projectId,
  contractId,
  docId,
  currentRole,
}: Props) {
  const { decideMutation } = useApproval(projectId, contractId, docId);
  const [comment, setComment] = useState('');

  const handleDecide = async (decision: 'APPROVED' | 'REJECTED') => {
    await decideMutation.mutateAsync({ decision, comment: comment || undefined });
    setComment('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Решение по согласованию</DialogTitle>
          <DialogDescription className="sr-only">Примите решение по текущему шагу согласования документа</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Текущий шаг: <span className="font-medium text-foreground">{currentRole}</span>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="comment">Комментарий (необязательно)</Label>
            <Textarea
              id="comment"
              placeholder="Добавьте комментарий к решению..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="destructive"
            onClick={() => handleDecide('REJECTED')}
            disabled={decideMutation.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Отклонить
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleDecide('APPROVED')}
            disabled={decideMutation.isPending}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Согласовать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
