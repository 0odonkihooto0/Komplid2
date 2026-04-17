'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Employee { id: string; firstName: string; lastName: string; position: string | null }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requireReason?: boolean;
  requireUser?: boolean;
  onConfirm: (reason?: string, userId?: string) => void;
}

export function ConfirmActionDialog({
  open, onOpenChange, title, description, requireReason, requireUser, onConfirm,
}: Props) {
  const [reason, setReason] = useState('');
  const [userId, setUserId] = useState('');

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      return (json.success ? json.data : []) as Employee[];
    },
    staleTime: 60_000,
    enabled: open && !!requireUser,
  });

  const canConfirm =
    (!requireReason || reason.trim().length > 0) &&
    (!requireUser || userId.length > 0);

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(requireReason ? reason.trim() : undefined, requireUser ? userId : undefined);
    setReason('');
    setUserId('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-gray-500">{description}</p>
        </DialogHeader>

        <div className="space-y-4">
          {requireReason && (
            <div>
              <Label>Причина / комментарий *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Укажите причину..."
                rows={3}
                className="mt-1"
              />
            </div>
          )}

          {requireUser && (
            <div>
              <Label>Выберите пользователя *</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                      {emp.position && ` — ${emp.position}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>{title}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
