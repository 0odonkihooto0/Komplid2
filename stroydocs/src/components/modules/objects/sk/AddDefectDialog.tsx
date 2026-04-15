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
import { Checkbox } from '@/components/ui/checkbox';
import { useAddDefectToInspection } from './useInspections';

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION:    'Нарушение качества',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY:          'Пожарная безопасность',
  ECOLOGY:              'Экология',
  DOCUMENTATION:        'Документация',
  OTHER:                'Прочее',
};

const schema = z.object({
  title:               z.string().min(1, 'Введите описание недостатка'),
  description:         z.string().optional(),
  category:            z.enum(['QUALITY_VIOLATION', 'TECHNOLOGY_VIOLATION', 'FIRE_SAFETY', 'ECOLOGY', 'DOCUMENTATION', 'OTHER']),
  normativeRef:        z.string().optional(),
  assigneeId:          z.string().optional(),
  deadline:            z.string().optional(),
  requiresSuspension:     z.boolean().default(false),
  gpsLat:                 z.string().optional(),
  gpsLng:                 z.string().optional(),
  substituteInspectorId:  z.string().optional(),
});

type FormValues = z.input<typeof schema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
}

interface Props {
  objectId: string;
  inspectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDefectDialog({ objectId, inspectionId, open, onOpenChange }: Props) {
  const addDefect = useAddDefectToInspection(objectId, inspectionId);

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
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'OTHER', requiresSuspension: false },
  });

  const requiresSuspension = watch('requiresSuspension');

  const onSubmit = (values: FormValues) => {
    addDefect.mutate(
      {
        title:              values.title,
        description:        values.description || undefined,
        category:           values.category,
        normativeRef:       values.normativeRef || undefined,
        assigneeId:              values.assigneeId || undefined,
        substituteInspectorId:   values.substituteInspectorId || undefined,
        requiresSuspension:      values.requiresSuspension ?? false,
        ...(values.deadline ? { deadline: new Date(values.deadline).toISOString() } : {}),
        ...(values.gpsLat && values.gpsLat !== '' ? { gpsLat: parseFloat(values.gpsLat) } : {}),
        ...(values.gpsLng && values.gpsLng !== '' ? { gpsLng: parseFloat(values.gpsLng) } : {}),
      },
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
          <DialogTitle>Добавить недостаток</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Описание недостатка *</Label>
            <Input id="title" placeholder="Кратко опишите недостаток" {...register('title')} />
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
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadline">Срок устранения</Label>
              <Input id="deadline" type="date" {...register('deadline')} />
            </div>
          </div>

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
            <Label>Замещающий инженер СК</Label>
            <Select onValueChange={(v) => setValue('substituteInspectorId', v === 'NONE' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Не указан" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Не указан</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.lastName} {e.firstName}{e.position ? ` — ${e.position}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Если инспектор будет отсутствовать (отпуск, болезнь), этот сотрудник сможет принять устранение
            </p>
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="requiresSuspension"
              checked={requiresSuspension}
              onCheckedChange={(checked) => setValue('requiresSuspension', !!checked)}
            />
            <Label htmlFor="requiresSuspension" className="cursor-pointer text-sm font-normal">
              Требует приостановки работ
            </Label>
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
            <Button type="submit" disabled={addDefect.isPending}>
              {addDefect.isPending ? 'Сохранение...' : 'Зафиксировать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
