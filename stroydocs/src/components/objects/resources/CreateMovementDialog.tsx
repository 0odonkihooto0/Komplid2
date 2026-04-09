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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WarehouseOption } from './useWarehouse';
import { MOVEMENT_SECTIONS, type SectionId } from './useWarehouseView';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: SectionId;
  date: string;
  onDateChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  needsFrom: boolean;
  needsTo: boolean;
  fromWarehouseId: string;
  onFromChange: (v: string) => void;
  toWarehouseId: string;
  onToChange: (v: string) => void;
  warehouses: WarehouseOption[];
  onSubmit: () => void;
  isPending: boolean;
}

export function CreateMovementDialog({
  open,
  onOpenChange,
  activeSection,
  date,
  onDateChange,
  notes,
  onNotesChange,
  needsFrom,
  needsTo,
  fromWarehouseId,
  onFromChange,
  toWarehouseId,
  onToChange,
  warehouses,
  onSubmit,
  isPending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Новое движение —{' '}
            {MOVEMENT_SECTIONS.find((s) => s.id === activeSection)?.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mov-date">Дата</Label>
            <Input
              id="mov-date"
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-notes">Примечание</Label>
            <Input
              id="mov-notes"
              placeholder="Необязательно"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>
          {needsFrom && (
            <div className="space-y-1.5">
              <Label htmlFor="from-warehouse">Склад (откуда)</Label>
              <Select value={fromWarehouseId} onValueChange={onFromChange}>
                <SelectTrigger id="from-warehouse">
                  <SelectValue placeholder="Выберите склад..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {needsTo && (
            <div className="space-y-1.5">
              <Label htmlFor="to-warehouse">Склад (куда)</Label>
              <Select value={toWarehouseId} onValueChange={onToChange}>
                <SelectTrigger id="to-warehouse">
                  <SelectValue placeholder="Выберите склад..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
