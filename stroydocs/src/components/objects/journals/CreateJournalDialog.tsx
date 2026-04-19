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
import type { SpecialJournalType } from '@prisma/client';
import { JOURNAL_TYPE_LABELS, JOURNAL_NORMATIVE_REFS } from './journal-constants';
import { useJournalRegistry } from './useJournalRegistry';

interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
}

interface ContractOption {
  id: string;
  number: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultType?: SpecialJournalType;
}

// CUSTOM скрыт из UI согласно требованиям ЦУС (нельзя создавать произвольные журналы)
const JOURNAL_TYPES = (Object.keys(JOURNAL_TYPE_LABELS) as SpecialJournalType[]).filter(
  (t) => t !== 'CUSTOM'
);

export function CreateJournalDialog({ open, onOpenChange, projectId, defaultType }: Props) {
  const { createMutation } = useJournalRegistry(projectId);

  const [type, setType] = useState<SpecialJournalType | ''>(defaultType ?? '');
  const [title, setTitle] = useState('');
  const [contractId, setContractId] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [normativeRef, setNormativeRef] = useState('');

  // Загрузка сотрудников организации
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      if (!json.success) return [];
      return json.data;
    },
    enabled: open,
  });

  // Загрузка договоров проекта
  const { data: contracts = [] } = useQuery<ContractOption[]>({
    queryKey: ['contracts', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/contracts`);
      const json = await res.json();
      if (!json.success) return [];
      return json.data.map((c: ContractOption) => ({
        id: c.id,
        number: c.number,
        title: c.name,
      }));
    },
    enabled: open,
  });

  const resetForm = () => {
    setType(defaultType ?? '');
    setTitle('');
    setContractId('');
    setResponsibleId('');
    setNormativeRef('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !responsibleId) return;

    createMutation.mutate(
      {
        type,
        title: title.trim() || undefined,
        contractId: contractId || undefined,
        responsibleId,
        normativeRef: normativeRef.trim() || undefined,
      },
      {
        onSuccess: () => handleOpenChange(false),
      }
    );
  };

  const displayName = (e: Employee) =>
    [e.lastName, e.firstName].filter(Boolean).join(' ') || 'Без имени';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать журнал</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Тип журнала */}
          <div className="space-y-1.5">
            <Label>Тип журнала *</Label>
            <Select value={type} onValueChange={(v) => {
                  const t = v as SpecialJournalType;
                  setType(t);
                  // Авто-заполнение нормативной ссылки если поле пустое
                  if (!normativeRef) {
                    setNormativeRef(JOURNAL_NORMATIVE_REFS[t] ?? '');
                  }
                }}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {JOURNAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {JOURNAL_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Название */}
          <div className="space-y-1.5">
            <Label>Название</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Авто-заполнится по типу"
            />
          </div>

          {/* Договор */}
          <div className="space-y-1.5">
            <Label>Договор</Label>
            <Select value={contractId || 'NONE'} onValueChange={(v) => setContractId(v === 'NONE' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Без привязки к договору" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Без привязки</SelectItem>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.number} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ответственный */}
          <div className="space-y-1.5">
            <Label>Ответственный *</Label>
            <Select value={responsibleId} onValueChange={setResponsibleId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {displayName(emp)}
                    {emp.position ? ` (${emp.position})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Нормативная ссылка */}
          <div className="space-y-1.5">
            <Label>Нормативная ссылка</Label>
            <Input
              value={normativeRef}
              onChange={(e) => setNormativeRef(e.target.value)}
              placeholder="СП 70.13330.2012, Прил. Ф"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!type || !responsibleId || createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
