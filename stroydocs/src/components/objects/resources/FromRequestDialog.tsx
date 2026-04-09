'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RequestOption } from './useProcurement';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRequestId: string;
  onSelectRequest: (id: string) => void;
  requestOptions: RequestOption[];
  onSubmit: () => void;
  isPending: boolean;
}

export function FromRequestDialog({
  open,
  onOpenChange,
  selectedRequestId,
  onSelectRequest,
  requestOptions,
  onSubmit,
  isPending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать заказ из заявки</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="request-select">Выберите заявку (ЛРВ)</Label>
            <Select value={selectedRequestId} onValueChange={onSelectRequest}>
              <SelectTrigger id="request-select">
                <SelectValue placeholder="Выберите заявку..." />
              </SelectTrigger>
              <SelectContent>
                {requestOptions.length === 0 ? (
                  <SelectItem value="" disabled>
                    Нет доступных заявок
                  </SelectItem>
                ) : (
                  requestOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.number} — {r._count.items} поз.
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!selectedRequestId || isPending}
          >
            {isPending ? 'Создание...' : 'Создать заказ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
