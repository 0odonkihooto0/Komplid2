'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/DataTable';
import { useGanttVersions, useGprResources, type GprWorkItem } from './usePlanning';
import { useToast } from '@/hooks/useToast';

// ─── Статусы ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' }> = {
  NOT_STARTED: { label: 'Не начата', variant: 'secondary' },
  IN_PROGRESS: { label: 'В работе', variant: 'default' },
  COMPLETED: { label: 'Завершена', variant: 'outline' },
  DELAYED: { label: 'Задержка', variant: 'destructive' },
  ON_HOLD: { label: 'Приостановлена', variant: 'secondary' },
};

// ─── Колонки таблицы ─────────────────────────────────────────────────────────

const columns: ColumnDef<GprWorkItem>[] = [
  {
    accessorKey: 'ganttTaskName',
    header: 'Наименование работы',
    cell: ({ row }) => <span className="text-sm">{row.original.ganttTaskName}</span>,
  },
  {
    accessorKey: 'workType',
    header: 'Вид работ',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.workType ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'volume',
    header: 'Объём',
    cell: ({ row }) => (
      <span className="text-sm text-right block">
        {row.original.volume != null
          ? row.original.volume.toLocaleString('ru-RU', { maximumFractionDigits: 3 })
          : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'volumeUnit',
    header: 'Ед.',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.volumeUnit ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'planStart',
    header: 'Начало (план)',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.planStart
          ? new Date(row.original.planStart).toLocaleDateString('ru-RU')
          : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'planEnd',
    header: 'Окончание (план)',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.planEnd
          ? new Date(row.original.planEnd).toLocaleDateString('ru-RU')
          : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const cfg = STATUS_CONFIG[row.original.status] ?? { label: row.original.status, variant: 'secondary' as const };
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
    },
  },
];

// ─── Компонент ────────────────────────────────────────────────────────────────

interface GprWorksPanelProps {
  objectId: string;
}

export function GprWorksPanel({ objectId }: GprWorksPanelProps) {
  const [versionId, setVersionId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { toast } = useToast();

  const { versions, isLoading: versionsLoading } = useGanttVersions(objectId);
  const { items, total, isLoading } = useGprResources<GprWorkItem>(objectId, {
    ganttVersionId: versionId || null,
    resourceType: 'works',
    from: from || undefined,
    to: to || undefined,
  });

  function handleExport() {
    toast({ title: 'Экспорт в разработке', description: 'Функция будет доступна в следующем обновлении' });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Работы из ГПР</h3>
        <div className="flex items-center gap-2">
          {versionId && (
            <span className="text-sm text-muted-foreground">Итого: {total} позиций</span>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            Экспорт в Excel
          </Button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 min-w-[200px]">
          <Label className="text-xs">Версия ГПР</Label>
          <Select
            value={versionId}
            onValueChange={setVersionId}
            disabled={versionsLoading}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Выберите версию..." />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}{v.isActive ? ' (активная)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Период с</Label>
          <Input
            type="date"
            className="h-8 text-sm w-36"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">по</Label>
          <Input
            type="date"
            className="h-8 text-sm w-36"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {/* Таблица */}
      {!versionId ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground border rounded-md">
          Выберите версию ГПР для отображения работ
        </div>
      ) : isLoading ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
          Загрузка...
        </div>
      ) : items.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground border rounded-md">
          В выбранной версии ГПР нет задач-работ
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          searchPlaceholder="Поиск по наименованию..."
          searchColumn="ganttTaskName"
        />
      )}
    </div>
  );
}
