'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePIRRegistries } from './usePIRRegistries';

interface ParticipantOrg {
  organization: { id: string; name: string };
  roles: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreatePIRRegistryDialog({ open, onOpenChange, projectId }: Props) {
  const { createMutation } = usePIRRegistries(projectId);

  const [senderOrgId, setSenderOrgId] = useState('');
  const [receiverOrgId, setReceiverOrgId] = useState('');
  const [notes, setNotes] = useState('');

  // Загружаем участников проекта для выбора отправителя/получателя
  const { data: participants = [] } = useQuery<ParticipantOrg[]>({
    queryKey: ['participants', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/participants`);
      const json: { success: boolean; data: ParticipantOrg[] } = await res.json();
      if (!json.success) return [];
      return json.data;
    },
    enabled: open,
  });

  const resetForm = () => {
    setSenderOrgId('');
    setReceiverOrgId('');
    setNotes('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        senderOrgId: senderOrgId || undefined,
        receiverOrgId: receiverOrgId || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать реестр передачи документации</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Отправитель */}
          <div className="space-y-1.5">
            <Label htmlFor="senderOrg">Отправитель (организация)</Label>
            <Select value={senderOrgId} onValueChange={setSenderOrgId}>
              <SelectTrigger id="senderOrg">
                <SelectValue placeholder="Выберите организацию" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.organization.id} value={p.organization.id}>
                    {p.organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Получатель */}
          <div className="space-y-1.5">
            <Label htmlFor="receiverOrg">Получатель (организация)</Label>
            <Select value={receiverOrgId} onValueChange={setReceiverOrgId}>
              <SelectTrigger id="receiverOrg">
                <SelectValue placeholder="Выберите организацию" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.organization.id} value={p.organization.id}>
                    {p.organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Примечание */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Примечание</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительные сведения..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
