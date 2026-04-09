'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCreateInspection } from './useInspections';

const schema = z.object({
  number:        z.string().min(1, 'Введите номер проверки'),
  inspectorId:   z.string().min(1, 'Укажите проверяющего'),
  responsibleId: z.string().optional(),
  comment:       z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
}

interface Props {
  objectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatEmployee(e: Employee) {
  return `${e.lastName} ${e.firstName}${e.position ? ` — ${e.position}` : ''}`;
}

// Автогенерация номера проверки на основе текущей даты/времени
function generateDefaultNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `ПВ-${y}${m}${d}`;
}

export function StartInspectionDialog({ objectId, open, onOpenChange }: Props) {
  const { data: session } = useSession();
  const create = useCreateInspection(objectId);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['org-employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      if (!json.success) return [];
      return json.data as Employee[];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const currentInspectorId = session?.user?.id ?? '';
  const defaultNumber = generateDefaultNumber();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      number:      defaultNumber,
      inspectorId: currentInspectorId,
    },
  });

  const onSubmit = (values: FormValues) => {
    create.mutate(values, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Начать проверку</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="number">Номер проверки *</Label>
            <Input
              id="number"
              placeholder={defaultNumber}
              {...register('number')}
            />
            {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Проверяющий *</Label>
            <Select
              defaultValue={currentInspectorId}
              onValueChange={(v) => setValue('inspectorId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите проверяющего" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {formatEmployee(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.inspectorId && (
              <p className="text-xs text-destructive">{errors.inspectorId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Ответственный со стороны подрядчика</Label>
            <Select onValueChange={(v) => setValue('responsibleId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Не назначен" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {formatEmployee(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              rows={2}
              placeholder="Цель и предмет проверки"
              {...register('comment')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Сохранение...' : 'Начать проверку'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
