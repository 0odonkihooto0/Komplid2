'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/utils/format';

// ---------------------------------------------------------------------------
// Типы
// ---------------------------------------------------------------------------

type BriefingType = 'INTRODUCTORY' | 'PRIMARY' | 'TARGETED' | 'REPEATED' | 'UNSCHEDULED';

const BRIEFING_TYPE_LABELS: Record<BriefingType, string> = {
  INTRODUCTORY: 'Вводный',
  PRIMARY:      'Первичный',
  TARGETED:     'Целевой',
  REPEATED:     'Повторный',
  UNSCHEDULED:  'Внеплановый',
};

interface BriefingRow {
  id:           string;
  type:         BriefingType;
  date:         string;
  topic:        string;
  notes:        string | null;
  participants: { userId?: string; fullName: string; signed: boolean }[] | null;
  conductedBy:  { id: string; firstName: string; lastName: string } | null;
}

interface Props {
  objectId: string;
}

// ---------------------------------------------------------------------------
// Схема создания инструктажа
// ---------------------------------------------------------------------------

const createSchema = z.object({
  type:  z.enum(['INTRODUCTORY', 'PRIMARY', 'TARGETED', 'REPEATED', 'UNSCHEDULED']),
  date:  z.string().min(1, 'Укажите дату'),
  topic: z.string().min(1, 'Введите тему инструктажа'),
  notes: z.string().optional(),
});
type CreateFormValues = z.infer<typeof createSchema>;

// ---------------------------------------------------------------------------
// Основной компонент
// ---------------------------------------------------------------------------

export function SafetyBriefingsView({ objectId }: Props) {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (typeFilter !== 'all') p.set('type', typeFilter);
    return p.toString();
  }, [typeFilter]);

  // Загрузка списка инструктажей
  const { data, isLoading } = useQuery<{ data: BriefingRow[]; total: number }>({
    queryKey: ['safety-briefings', objectId, typeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/safety-briefings?${queryParams}`);
      if (!res.ok) throw new Error('Ошибка загрузки инструктажей');
      const json = await res.json();
      return json.data;
    },
  });

  const briefings = data?.data ?? [];

  // Форма создания
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({ resolver: zodResolver(createSchema) });

  const { mutate: createBriefing, isPending } = useMutation({
    mutationFn: async (values: CreateFormValues) => {
      const res = await fetch(`/api/projects/${objectId}/safety-briefings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, date: new Date(values.date).toISOString() }),
      });
      if (!res.ok) throw new Error('Ошибка создания инструктажа');
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['safety-briefings', objectId] });
      setDialogOpen(false);
      reset();
    },
  });

  const columns: ColumnDef<BriefingRow, unknown>[] = useMemo(() => [
    {
      accessorKey: 'date',
      header:      'Дата',
      size:        120,
      cell:        ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: 'type',
      header:      'Вид',
      cell:        ({ row }) => (
        <Badge variant="secondary">{BRIEFING_TYPE_LABELS[row.original.type]}</Badge>
      ),
    },
    {
      accessorKey: 'topic',
      header:      'Тема',
    },
    {
      id:     'conductor',
      header: 'Инструктор',
      cell:   ({ row }) => {
        const u = row.original.conductedBy;
        return u ? `${u.lastName} ${u.firstName}` : '—';
      },
    },
    {
      id:     'participants',
      header: 'Участники',
      size:   100,
      cell:   ({ row }) => row.original.participants?.length ?? 0,
    },
    {
      accessorKey: 'notes',
      header:      'Примечание',
      cell:        ({ row }) => row.original.notes ?? '—',
    },
  ], []);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Шапка */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Инструктажи по ОТиТБ</h2>
          <span className="text-sm text-muted-foreground">({data?.total ?? 0})</span>
        </div>

        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Все виды" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все виды</SelectItem>
              {(Object.keys(BRIEFING_TYPE_LABELS) as BriefingType[]).map((t) => (
                <SelectItem key={t} value={t}>{BRIEFING_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setDialogOpen(true)}>Добавить инструктаж</Button>
        </div>
      </div>

      {/* Таблица */}
      <DataTable
        columns={columns}
        data={briefings}
        searchPlaceholder="Поиск по теме..."
        searchColumn="topic"
      />

      {/* Диалог создания */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новый инструктаж по ОТиТБ</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit((v) => createBriefing(v))} className="space-y-4">
            {/* Вид инструктажа */}
            <div className="space-y-1.5">
              <Label htmlFor="briefing-type">Вид инструктажа *</Label>
              <Select onValueChange={(v) => setValue('type', v as BriefingType)}>
                <SelectTrigger id="briefing-type">
                  <SelectValue placeholder="Выберите вид" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(BRIEFING_TYPE_LABELS) as [BriefingType, string][]).map(
                    ([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            {/* Дата */}
            <div className="space-y-1.5">
              <Label htmlFor="briefing-date">Дата проведения *</Label>
              <Input id="briefing-date" type="date" {...register('date')} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>

            {/* Тема */}
            <div className="space-y-1.5">
              <Label htmlFor="briefing-topic">Тема *</Label>
              <Input
                id="briefing-topic"
                placeholder="Кратко опишите тему инструктажа"
                {...register('topic')}
              />
              {errors.topic && (
                <p className="text-xs text-destructive">{errors.topic.message}</p>
              )}
            </div>

            {/* Примечание */}
            <div className="space-y-1.5">
              <Label htmlFor="briefing-notes">Примечание</Label>
              <Textarea
                id="briefing-notes"
                placeholder="Дополнительные сведения (необязательно)"
                {...register('notes')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Сохранение...' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
