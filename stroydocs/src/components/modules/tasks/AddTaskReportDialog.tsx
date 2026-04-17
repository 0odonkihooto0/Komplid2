'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { progress: string; newDeadline?: string }) => void;
  isPending: boolean;
}

export function AddTaskReportDialog({ open, onOpenChange, onSubmit, isPending }: Props) {
  const [progress, setProgress] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  function handleSubmit() {
    if (!progress.trim()) return;
    onSubmit({
      progress: progress.trim(),
      ...(newDeadline ? { newDeadline: new Date(newDeadline).toISOString() } : {}),
    });
    setProgress('');
    setNewDeadline('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Отчёт о выполнении</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="progress">Ход выполнения *</Label>
            <Textarea
              id="progress"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              placeholder="Опишите, что было сделано..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="new-deadline">Изменить срок выполнения (опционально)</Label>
            <Input
              id="new-deadline"
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!progress.trim() || isPending}>
            {isPending ? 'Сохранение...' : 'Добавить отчёт'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
