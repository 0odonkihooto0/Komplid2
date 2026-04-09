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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useExtendDefectDeadline } from '@/components/modules/defects/useDefects';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defectId: string;
  currentDeadline?: string | null;
}

export function ExtendDeadlineDialog({
  open,
  onOpenChange,
  projectId,
  defectId,
  currentDeadline,
}: Props) {
  const minDate = new Date().toISOString().split('T')[0];
  const [newDate, setNewDate] = useState(
    currentDeadline ? currentDeadline.split('T')[0] : minDate,
  );
  const [reason, setReason] = useState('');
  const extend = useExtendDefectDeadline(projectId);

  function handleSubmit() {
    if (!newDate || !reason.trim()) return;
    extend.mutate(
      { defectId, deadline: new Date(newDate).toISOString(), reason: reason.trim() },
      {
        onSuccess: () => {
          setReason('');
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Продлить срок устранения</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-deadline">Новый срок *</Label>
            <Input
              id="new-deadline"
              type="date"
              value={newDate}
              min={minDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="extend-reason">Причина продления *</Label>
            <Textarea
              id="extend-reason"
              placeholder="Укажите причину продления срока"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newDate || !reason.trim() || extend.isPending}
          >
            Продлить срок
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
