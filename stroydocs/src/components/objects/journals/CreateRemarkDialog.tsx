'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { CreateRemarkInput } from '@/lib/validations/journal-schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateRemarkInput) => void;
  isPending: boolean;
}

export function CreateRemarkDialog({ open, onOpenChange, onSubmit, isPending }: Props) {
  const [text, setText] = useState('');
  const [deadline, setDeadline] = useState('');

  function handleClose(v: boolean) {
    if (!v) {
      setText('');
      setDeadline('');
    }
    onOpenChange(v);
  }

  function handleSubmit() {
    if (!text.trim()) return;
    onSubmit({
      text: text.trim(),
      ...(deadline ? { deadline } : {}),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить замечание</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="remark-text">Текст замечания *</Label>
            <Textarea
              id="remark-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Опишите замечание..."
            />
          </div>
          <div>
            <Label htmlFor="remark-deadline">Срок устранения</Label>
            <Input
              id="remark-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !text.trim()}>
            {isPending ? 'Добавление...' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
