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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDesignDocs } from './useDesignDocs';
import type { DesignDocType } from '@prisma/client';

interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
}

interface ParticipantOrg {
  organization: { id: string; name: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

// Метки типов документации ПИР
const DOC_TYPE_LABELS: Record<DesignDocType, string> = {
  DESIGN_PD:    'Проектная документация (ПД)',
  WORKING_RD:   'Рабочая документация (РД)',
  SURVEY:       'Результаты изысканий',
  REPEATED_USE: 'Повторного применения',
};

export function CreateDesignDocDialog({ open, onOpenChange, projectId }: Props) {
  const { createMutation } = useDesignDocs(projectId);

  const [docType, setDocType] = useState<DesignDocType>('DESIGN_PD');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [responsibleOrgId, setResponsibleOrgId] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      if (!json.success) return [];
      return json.data;
    },
  });

  const { data: participants = [] } = useQuery<ParticipantOrg[]>({
    queryKey: ['participants', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/participants`);
      const json = await res.json();
      if (!json.success) return [];
      return json.data;
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate(
      {
        name: name.trim(),
        docType,
        category: category.trim() || undefined,
        responsibleOrgId: responsibleOrgId || undefined,
        responsibleUserId: responsibleUserId || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setDocType('DESIGN_PD');
    setName('');
    setCategory('');
    setResponsibleOrgId('');
    setResponsibleUserId('');
    setNotes('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать документ ПИР</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Тип документации */}
          <div className="space-y-1.5">
            <Label htmlFor="docType">Тип документации</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as DesignDocType)}>
              <SelectTrigger id="docType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DOC_TYPE_LABELS) as DesignDocType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOC_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Наименование */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Наименование <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Архитектурные решения"
              required
            />
          </div>

          {/* Раздел / Шифр */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Раздел / Шифр</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Например: АС-01"
            />
          </div>

          {/* Ответственная организация */}
          <div className="space-y-1.5">
            <Label htmlFor="responsibleOrg">Ответственная организация</Label>
            <Select value={responsibleOrgId} onValueChange={setResponsibleOrgId}>
              <SelectTrigger id="responsibleOrg">
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

          {/* Ответственный сотрудник */}
          <div className="space-y-1.5">
            <Label htmlFor="responsibleUser">Ответственный</Label>
            <Select value={responsibleUserId} onValueChange={setResponsibleUserId}>
              <SelectTrigger id="responsibleUser">
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.lastName} {e.firstName}
                    {e.position ? ` (${e.position})` : ''}
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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
