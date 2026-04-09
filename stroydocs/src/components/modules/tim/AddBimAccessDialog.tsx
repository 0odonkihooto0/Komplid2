'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { BimAccessLevel, BimModelStage } from '@prisma/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCreateBimAccess, ACCESS_LEVEL_LABELS, STAGE_LABELS } from './useBimAccess';

// ─── Схема валидации ──────────────────────────────────────────────────────────

const schema = z.object({
  userId: z.string().uuid('Выберите пользователя'),
  level: z.nativeEnum(BimAccessLevel),
  stage: z.nativeEnum(BimModelStage).optional().nullable(),
  status: z.string().max(100).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Типы ─────────────────────────────────────────────────────────────────────

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
}

// ─── Компонент ────────────────────────────────────────────────────────────────

export function AddBimAccessDialog({ projectId, open, onOpenChange }: Props) {
  const create = useCreateBimAccess(projectId);

  // Загрузка сотрудников организации только при открытом диалоге
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

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { level: BimAccessLevel.VIEW },
  });

  const onSubmit = (values: FormValues) => {
    create.mutate(
      { ...values, stage: values.stage ?? null, status: values.status ?? null },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить права доступа к ЦИМ</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Пользователь */}
          <div className="space-y-1.5">
            <Label>Пользователь *</Label>
            <Select onValueChange={(v) => setValue('userId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.lastName} {e.firstName}{e.position ? ` — ${e.position}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.userId && (
              <p className="text-xs text-destructive">{errors.userId.message}</p>
            )}
          </div>

          {/* Уровень доступа */}
          <div className="space-y-1.5">
            <Label>Уровень доступа *</Label>
            <Select
              defaultValue={BimAccessLevel.VIEW}
              onValueChange={(v) => setValue('level', v as BimAccessLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.values(BimAccessLevel) as BimAccessLevel[]).map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {ACCESS_LEVEL_LABELS[lvl]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Стадия (опционально) */}
          <div className="space-y-1.5">
            <Label>Стадия ЦИМ</Label>
            <Select onValueChange={(v) => setValue('stage', v as BimModelStage)}>
              <SelectTrigger>
                <SelectValue placeholder="Все стадии" />
              </SelectTrigger>
              <SelectContent>
                {(Object.values(BimModelStage) as BimModelStage[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Статус модели (опционально) */}
          <div className="space-y-1.5">
            <Label htmlFor="status">Статус модели</Label>
            <Input
              id="status"
              placeholder="Согласована, Утверждена..."
              {...register('status')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Сохранение...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
