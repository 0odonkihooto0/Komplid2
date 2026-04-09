'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
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
import { useCreateDefect } from './useDefects';

const schema = z.object({
  title:        z.string().min(1, 'Введите название дефекта'),
  description:  z.string().optional(),
  category:     z.enum(['QUALITY_VIOLATION', 'TECHNOLOGY_VIOLATION', 'FIRE_SAFETY', 'ECOLOGY', 'DOCUMENTATION', 'OTHER']),
  contractId:   z.string().optional(),
  normativeRef: z.string().optional(),
  assigneeId:   z.string().optional(),
  deadline:     z.string().optional(),
  gpsLat:       z.string().optional(),
  gpsLng:       z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
}

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts?: { id: string; number: string; name: string }[];
}

export function CreateDefectDialog({ projectId, open, onOpenChange, contracts = [] }: Props) {
  const create = useCreateDefect(projectId);

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

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'OTHER' },
  });

  const onSubmit = (values: FormValues) => {
    create.mutate(
      {
        ...values,
        ...(values.deadline ? { deadline: new Date(values.deadline).toISOString() } : {}),
        ...(values.gpsLat && values.gpsLat !== '' ? { gpsLat: parseFloat(values.gpsLat) } : {}),
        ...(values.gpsLng && values.gpsLng !== '' ? { gpsLng: parseFloat(values.gpsLng) } : {}),
      } as never,
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Зафиксировать дефект</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Описание дефекта *</Label>
            <Input id="title" placeholder="Кратко опишите дефект" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Категория</Label>
              <Select
                defaultValue="OTHER"
                onValueChange={(v) => setValue('category', v as FormValues['category'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUALITY_VIOLATION">Нарушение ОТ</SelectItem>
                  <SelectItem value="TECHNOLOGY_VIOLATION">Нарушение технологии</SelectItem>
                  <SelectItem value="FIRE_SAFETY">Пожарная безопасность</SelectItem>
                  <SelectItem value="ECOLOGY">Экология</SelectItem>
                  <SelectItem value="DOCUMENTATION">Документация</SelectItem>
                  <SelectItem value="OTHER">Прочее</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadline">Срок устранения</Label>
              <Input id="deadline" type="date" {...register('deadline')} />
            </div>
          </div>

          {contracts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Договор</Label>
              <Select onValueChange={(v) => setValue('contractId', v)}>
                <SelectTrigger><SelectValue placeholder="Не привязан" /></SelectTrigger>
                <SelectContent>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Ответственный</Label>
            <Select onValueChange={(v) => setValue('assigneeId', v)}>
              <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.lastName} {e.firstName}{e.position ? ` — ${e.position}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="normativeRef">Нормативная ссылка</Label>
            <Input
              id="normativeRef"
              placeholder="СП 70.13330.2012 п. 7.3"
              {...register('normativeRef')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Подробное описание</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Дополнительная информация"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gpsLat">GPS широта</Label>
              <Input
                id="gpsLat"
                type="number"
                step="any"
                placeholder="55.7558"
                {...register('gpsLat')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gpsLng">GPS долгота</Label>
              <Input
                id="gpsLng"
                type="number"
                step="any"
                placeholder="37.6173"
                {...register('gpsLng')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Сохранение...' : 'Зафиксировать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
