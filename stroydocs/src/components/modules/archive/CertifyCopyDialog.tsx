'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useArchive } from './useArchive';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  projectId: string;
  archiveId: string;
}

export function CertifyCopyDialog({ open, onOpenChange, contractId, projectId, archiveId }: Props) {
  const { certifyMutation } = useArchive(contractId);
  const [certifiedByName, setCertifiedByName] = useState('');
  const [certifiedByPos, setCertifiedByPos] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certifiedByName || !certifiedByPos) return;

    certifyMutation.mutate(
      { projectId, archiveId, certifiedByName, certifiedByPos },
      {
        onSuccess: () => {
          setCertifiedByName('');
          setCertifiedByPos('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Штамп «Копия верна»</DialogTitle>
          <DialogDescription className="sr-only">Введите данные заверяющего для простановки штампа на документ</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>ФИО заверяющего *</Label>
            <Input
              value={certifiedByName}
              onChange={(e) => setCertifiedByName(e.target.value)}
              placeholder="Иванов И.И."
            />
          </div>
          <div className="space-y-2">
            <Label>Должность *</Label>
            <Input
              value={certifiedByPos}
              onChange={(e) => setCertifiedByPos(e.target.value)}
              placeholder="Начальник ПТО"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={!certifiedByName || !certifiedByPos || certifyMutation.isPending}>
              {certifyMutation.isPending ? 'Обработка...' : 'Заверить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
