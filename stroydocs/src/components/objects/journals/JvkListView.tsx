'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Info, Plus } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { JournalStatus } from '@prisma/client';
import {
  JOURNAL_STATUS_LABELS,
  type JournalListItem,
} from './journal-constants';
import { JournalStatusBadge } from './JournalStatusBadge';
import { useJournalRegistry } from './useJournalRegistry';
import { CreateJournalDialog } from './CreateJournalDialog';

const STATUS_OPTIONS = Object.keys(JOURNAL_STATUS_LABELS) as JournalStatus[];

// === Колонки таблицы ===

const columns: ColumnDef<JournalListItem>[] = [
  {
    accessorKey: 'number',
    header: 'Номер',
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.number}</span>
    ),
  },
  {
    accessorKey: 'title',
    header: 'Название',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.title}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => <JournalStatusBadge status={row.original.status} />,
  },
  {
    id: 'entries',
    header: 'Записей',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original._count.entries}
      </span>
    ),
  },
  {
    id: 'responsible',
    header: 'Ответственный',
    cell: ({ row }) => {
      const r = row.original.responsible;
      return (
        <span className="text-sm text-muted-foreground">
          {[r.lastName, r.firstName].filter(Boolean).join(' ') || '—'}
        </span>
      );
    },
  },
  {
    id: 'contract',
    header: 'Договор',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.contract?.number ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'openedAt',
    header: 'Открыт',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.openedAt), 'd MMM yyyy', { locale: ru })}
      </span>
    ),
  },
];

// === Компонент ===

interface Props {
  objectId: string;
}

export function JvkListView({ objectId }: Props) {
  const router = useRouter();
  const vm = useJournalRegistry(objectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<JournalStatus | 'ALL'>('ALL');

  // Фильтрация клиентски: только INPUT_CONTROL + по статусу
  const filtered = vm.journals.filter((j) => {
    if (j.type !== 'INPUT_CONTROL') return false;
    if (statusFilter !== 'ALL' && j.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Журнал входного контроля (ЖВК)</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Создать ЖВК
        </Button>
      </div>

      {/* Информационное сообщение об интеграции */}
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Записи входного контроля материалов (партионный учёт, АВК) доступны в карточке
          договора → вкладка «Входной контроль».
        </span>
      </div>

      {/* Фильтр по статусу */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Статус</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as JournalStatus | 'ALL')}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все статусы</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {JOURNAL_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {statusFilter !== 'ALL' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter('ALL')}
            className="h-9 self-end"
          >
            Сбросить
          </Button>
        )}
      </div>

      {/* Таблица */}
      {vm.isLoading ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
          Загрузка...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Журналов входного контроля пока нет. Создайте первый ЖВК.
          </p>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Создать ЖВК
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Поиск по номеру..."
          searchColumn="number"
          onRowClick={(row) =>
            router.push(`/objects/${objectId}/journals/${row.id}`)
          }
        />
      )}

      <CreateJournalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={objectId}
        defaultType="INPUT_CONTROL"
      />
    </div>
  );
}
