'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { addParticipantSchema, type AddParticipantInput } from '@/lib/validations/contract';

const ROLE_OPTIONS = [
  { value: 'DEVELOPER', label: 'Застройщик' },
  { value: 'CONTRACTOR', label: 'Подрядчик' },
  { value: 'SUPERVISION', label: 'Авторский надзор' },
  { value: 'SUBCONTRACTOR', label: 'Субподрядчик' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
}

export function AddParticipantDialog({ open, onOpenChange, projectId, contractId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddParticipantInput>({
    resolver: zodResolver(addParticipantSchema),
    defaultValues: { organizationId: '', role: 'CONTRACTOR' },
  });

  const mutation = useMutation({
    mutationFn: async (data: AddParticipantInput) => {
      const res = await fetch(
        `/api/objects/${projectId}/contracts/${contractId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', projectId, contractId] });
      toast({ title: 'Участник добавлен' });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить участника</DialogTitle>
          <DialogDescription className="sr-only">Добавьте организацию-участника строительства к договору</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label>ID организации</Label>
            <Input
              placeholder="UUID организации"
              {...form.register('organizationId')}
            />
            {form.formState.errors.organizationId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.organizationId.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              В будущем здесь будет поиск по названию / ИНН
            </p>
          </div>
          <div className="space-y-2">
            <Label>Роль</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(val) => form.setValue('role', val as AddParticipantInput['role'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>ФИО представителя</Label>
            <Input placeholder="Иванов Иван Иванович" {...form.register('representativeName')} />
          </div>
          <div className="space-y-2">
            <Label>Должность</Label>
            <Input placeholder="Главный инженер" {...form.register('position')} />
          </div>
          <div className="space-y-2">
            <Label>Номер приказа</Label>
            <Input {...form.register('appointmentOrder')} />
          </div>
          <div className="space-y-2">
            <Label>Дата приказа</Label>
            <Input type="date" {...form.register('appointmentDate')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Добавление...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
