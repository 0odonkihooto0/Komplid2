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
import { useDesignTasks } from './useDesignTasks';
import type { DesignTaskType } from '@prisma/client';

interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
}

interface ParticipantOrg {
  organization: {
    id: string;
    name: string;
  };
  roles: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  taskType: DesignTaskType;
}

export function CreateDesignTaskDialog({ open, onOpenChange, projectId, taskType }: Props) {
  const { createMutation } = useDesignTasks(projectId, taskType);

  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [approvedById, setApprovedById] = useState('');
  const [agreedById, setAgreedById] = useState('');
  const [customerOrgId, setCustomerOrgId] = useState('');
  const [customerPersonId, setCustomerPersonId] = useState('');
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

  // Участники проекта (организации) — только для задания на изыскания
  const { data: participants = [] } = useQuery<ParticipantOrg[]>({
    queryKey: ['participants', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/participants`);
      const json = await res.json();
      if (!json.success) return [];
      return json.data;
    },
    enabled: taskType === 'SURVEY',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        taskType,
        docDate: new Date(docDate).toISOString(),
        approvedById: approvedById || undefined,
        agreedById: agreedById || undefined,
        customerOrgId: customerOrgId || undefined,
        customerPersonId: customerPersonId || undefined,
        notes: notes || undefined,
        s3Keys: [],
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
    setDocDate(new Date().toISOString().slice(0, 10));
    setApprovedById('');
    setAgreedById('');
    setCustomerOrgId('');
    setCustomerPersonId('');
    setNotes('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const title = taskType === 'DESIGN'
    ? 'Создать задание на проектирование'
    : 'Создать задание на изыскания';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Дата документа */}
          <div className="space-y-1.5">
            <Label htmlFor="docDate">Дата документа</Label>
            <Input
              id="docDate"
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              required
            />
          </div>

          {/* Утверждаю */}
          <div className="space-y-1.5">
            <Label htmlFor="approvedBy">Утверждаю</Label>
            <Select value={approvedById} onValueChange={setApprovedById}>
              <SelectTrigger id="approvedBy">
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

          {/* Согласовано */}
          <div className="space-y-1.5">
            <Label htmlFor="agreedBy">Согласовано</Label>
            <Select value={agreedById} onValueChange={setAgreedById}>
              <SelectTrigger id="agreedBy">
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

          {/* Дополнительные поля для задания на изыскания */}
          {taskType === 'SURVEY' && (
            <>
              {/* Заказчик */}
              <div className="space-y-1.5">
                <Label htmlFor="customerOrg">Заказчик</Label>
                <Select value={customerOrgId} onValueChange={setCustomerOrgId}>
                  <SelectTrigger id="customerOrg">
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

              {/* Представитель заказчика */}
              <div className="space-y-1.5">
                <Label htmlFor="customerPerson">Представитель заказчика</Label>
                <Select value={customerPersonId} onValueChange={setCustomerPersonId}>
                  <SelectTrigger id="customerPerson">
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
            </>
          )}

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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
