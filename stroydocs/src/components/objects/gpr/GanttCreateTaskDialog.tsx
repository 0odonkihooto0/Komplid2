'use client';

import { Loader2 } from 'lucide-react';
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
import type { NewTaskForm } from './useGanttScheduleView';

interface Props {
  open: boolean;
  onClose: () => void;
  form: NewTaskForm;
  onFormChange: (field: keyof NewTaskForm, value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function GanttCreateTaskDialog({
  open, onClose, form, onFormChange, onSubmit, isPending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">Наименование</Label>
            <Input
              value={form.name}
              onChange={(e: { target: { value: string } }) => onFormChange('name', e.target.value)}
              placeholder="Введите наименование задачи"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Начало план</Label>
              <Input
                type="date"
                value={form.planStart}
                onChange={(e: { target: { value: string } }) => onFormChange('planStart', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Конец план</Label>
              <Input
                type="date"
                value={form.planEnd}
                onChange={(e: { target: { value: string } }) => onFormChange('planEnd', e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={!form.name.trim() || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
