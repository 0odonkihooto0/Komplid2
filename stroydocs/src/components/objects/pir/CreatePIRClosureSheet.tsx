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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePIRClosureActs } from './usePIRClosureActs';

interface ParticipantOrg {
  organization: { id: string; name: string };
  roles: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreatePIRClosureSheet({ open, onOpenChange, projectId }: Props) {
  const { createMutation } = usePIRClosureActs(projectId);

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [contractorOrgId, setContractorOrgId] = useState('');
  const [customerOrgId, setCustomerOrgId] = useState('');

  // Загружаем участников проекта для выбора подрядчика и заказчика
  const { data: participants = [] } = useQuery<ParticipantOrg[]>({
    queryKey: ['participants', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${projectId}/participants`);
      const json: ApiResponse<ParticipantOrg[]> = await res.json();
      return json.success ? json.data : [];
    },
    enabled: open,
  });

  const resetForm = () => {
    setPeriodStart('');
    setPeriodEnd('');
    setContractorOrgId('');
    setCustomerOrgId('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd) return;

    createMutation.mutate(
      {
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        contractorOrgId: contractorOrgId || undefined,
        customerOrgId: customerOrgId || undefined,
      },
      {
        onSuccess: () => handleOpenChange(false),
      }
    );
  };

  // Валидация: конец периода не раньше начала
  const isEndBeforeStart = periodStart && periodEnd && periodEnd < periodStart;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать акт закрытия ПИР</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Период */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="periodStart">Период с</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodEnd">по</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </div>
          </div>
          {isEndBeforeStart && (
            <p className="text-xs text-destructive">
              Дата окончания не может быть раньше даты начала
            </p>
          )}

          {/* Подрядчик */}
          <div className="space-y-1.5">
            <Label htmlFor="contractorOrg">Подрядчик</Label>
            <Select value={contractorOrgId} onValueChange={setContractorOrgId}>
              <SelectTrigger id="contractorOrg">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !!isEndBeforeStart}>
              {createMutation.isPending ? 'Создание…' : 'Создать акт'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
