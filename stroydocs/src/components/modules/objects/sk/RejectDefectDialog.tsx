'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRejectDefect } from '@/components/modules/defects/useDefects';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defectId: string;
}

export function RejectDefectDialog({ open, onOpenChange, projectId, defectId }: Props) {
  const [comment, setComment] = useState('');
  const reject = useRejectDefect(projectId);

  function handleSubmit() {
    if (!comment.trim()) return;
    reject.mutate(
      { defectId, comment: comment.trim() },
      {
        onSuccess: () => {
          setComment('');
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Вернуть на доработку</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="reject-comment">Причина возврата *</Label>
          <Textarea
            id="reject-comment"
            placeholder="Укажите причину возврата дефекта на доработку"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!comment.trim() || reject.isPending}
          >
            Вернуть на доработку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
