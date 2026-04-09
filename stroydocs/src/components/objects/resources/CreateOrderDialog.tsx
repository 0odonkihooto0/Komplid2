'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  number: string;
  onNumberChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  number,
  onNumberChange,
  notes,
  onNotesChange,
  onSubmit,
  isPending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новый заказ поставщику</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="order-number">Номер заказа</Label>
            <Input
              id="order-number"
              placeholder="Будет сгенерирован автоматически"
              value={number}
              onChange={(e) => onNumberChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="order-notes">Примечание</Label>
            <Input
              id="order-notes"
              placeholder="Необязательно"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? 'Создание...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
