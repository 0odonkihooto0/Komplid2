'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus } from 'lucide-react';
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
import type { JournalStatus, SpecialJournalType } from '@prisma/client';
import {
  JOURNAL_TYPE_LABELS,
  JOURNAL_STATUS_LABELS,
  type JournalListItem,
} from './journal-constants';
import { JournalStatusBadge } from './JournalStatusBadge';
import { JournalTypeBadge } from './JournalTypeBadge';
import { useJournalRegistry } from './useJournalRegistry';
import { CreateJournalDialog } from './CreateJournalDialog';

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
    accessorKey: 'type',
    header: 'Тип',
    cell: ({ row }) => <JournalTypeBadge type={row.original.type} />,
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

const TYPE_OPTIONS = Object.keys(JOURNAL_TYPE_LABELS) as SpecialJournalType[];
const STATUS_OPTIONS = Object.keys(JOURNAL_STATUS_LABELS) as JournalStatus[];

// === Компонент ===

interface Props {
  objectId: string;
}

export function JournalRegistry({ objectId }: Props) {
  const vm = useJournalRegistry(objectId);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Реестр журналов</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Создать журнал
        </Button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Тип</Label>
          <Select
            value={vm.typeFilter}
            onValueChange={(v) => vm.setTypeFilter(v as SpecialJournalType | '')}
          >
            <SelectTrigger className="w-52 h-9">
              <SelectValue placeholder="Все типы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все типы</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {JOURNAL_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Статус</Label>
          <Select
            value={vm.statusFilter}
            onValueChange={(v) => vm.setStatusFilter(v as JournalStatus | '')}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все статусы</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {JOURNAL_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {vm.hasFilters && (
          <Button variant="ghost" size="sm" onClick={vm.handleReset} className="h-9 self-end">
            Сбросить
          </Button>
        )}
      </div>

      {/* Таблица */}
      {vm.isLoading ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
          Загрузка...
        </div>
      ) : vm.journals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Журналов пока нет. Создайте первый журнал для объекта.
          </p>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Создать журнал
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={vm.journals}
          searchPlaceholder="Поиск по номеру..."
          searchColumn="number"
          onRowClick={vm.handleRowClick}
        />
      )}

      <CreateJournalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={objectId}
      />
    </div>
  );
}
