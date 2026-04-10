'use client';

import { useState } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ENTITY_TYPES = [
  { value: 'SEDDocument',  label: 'СЭД-документ' },
  { value: 'Contract',     label: 'Договор' },
  { value: 'ExecutionDoc', label: 'Исп. документ' },
  { value: 'DesignDoc',    label: 'ПИР-документ' },
  { value: 'DesignTask',   label: 'Задание ПИР' },
];

interface AddSEDLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addLinkMutation: UseMutationResult<unknown, Error, { entityType: string; entityId: string }>;
}

export function AddSEDLinkDialog({ open, onOpenChange, addLinkMutation }: AddSEDLinkDialogProps) {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityType || !entityId.trim()) return;
    addLinkMutation.mutate(
      { entityType, entityId: entityId.trim() },
      {
        onSuccess: () => {
          setEntityType('');
          setEntityId('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить связь</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entityType">Тип объекта</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger id="entityType">
                <SelectValue placeholder="Выберите тип..." />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="entityId">Идентификатор объекта (UUID)</Label>
            <Input
              id="entityId"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!entityType || !entityId.trim() || addLinkMutation.isPending}
            >
              {addLinkMutation.isPending ? 'Добавление...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
