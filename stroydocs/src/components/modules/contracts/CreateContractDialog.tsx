'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
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
import { createContractSchema, type CreateContractInput } from '@/lib/validations/contract';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentContracts?: { id: string; number: string; name: string }[];
}

interface ContractKindOption {
  id: string;
  name: string;
  code: string;
}

export function CreateContractDialog({ open, onOpenChange, projectId, parentContracts = [] }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateContractInput>({
    resolver: zodResolver(createContractSchema),
    defaultValues: { number: '', name: '', type: 'MAIN', contractKindId: null },
  });

  const contractType = form.watch('type');
  const contractKindId = form.watch('contractKindId');

  const { data: contractKinds = [] } = useQuery<ContractKindOption[]>({
    queryKey: ['references', 'contractKinds'],
    queryFn: async () => {
      const res = await fetch('/api/references/contractKinds?limit=50');
      const json = await res.json();
      if (!json.success) return [];
      return (json.data?.items ?? json.data) as ContractKindOption[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateContractInput) => {
      const res = await fetch(`/api/objects/${projectId}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: 'Договор создан' });
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
          <DialogTitle>Новый договор</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Номер договора</Label>
              <Input {...form.register('number')} />
              {form.formState.errors.number && (
                <p className="text-xs text-destructive">{form.formState.errors.number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select
                value={contractType}
                onValueChange={(val) => form.setValue('type', val as 'MAIN' | 'SUBCONTRACT')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN">Основной</SelectItem>
                  <SelectItem value="SUBCONTRACT">Субдоговор</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Вид работ</Label>
            <Select
              value={contractKindId ?? 'NONE'}
              onValueChange={(val) => form.setValue('contractKindId', val === 'NONE' ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите вид работ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Не указан</SelectItem>
                {contractKinds.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Наименование</Label>
            <Input {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          {contractType === 'SUBCONTRACT' && parentContracts.length > 0 && (
            <div className="space-y-2">
              <Label>Родительский договор</Label>
              <Select
                value={form.watch('parentId') || ''}
                onValueChange={(val) => form.setValue('parentId', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите договор" />
                </SelectTrigger>
                <SelectContent>
                  {parentContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Дата начала</Label>
              <Input type="date" {...form.register('startDate')} />
            </div>
            <div className="space-y-2">
              <Label>Дата окончания</Label>
              <Input type="date" {...form.register('endDate')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
