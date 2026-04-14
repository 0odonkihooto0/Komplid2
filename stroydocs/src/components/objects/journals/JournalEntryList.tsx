'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MessageSquare } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { JournalEntryStatus } from '@prisma/client';
import {
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_CLASS,
  type JournalEntryItem,
} from './journal-constants';

// === Колонки таблицы записей ===

const columns: ColumnDef<JournalEntryItem>[] = [
  {
    accessorKey: 'entryNumber',
    header: '№',
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.entryNumber}</span>
    ),
  },
  {
    accessorKey: 'date',
    header: 'Дата',
    cell: ({ row }) => (
      <span className="text-sm">
        {format(new Date(row.original.date), 'd MMM yyyy', { locale: ru })}
      </span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Описание',
    cell: ({ row }) => (
      <span className="text-sm line-clamp-2 max-w-xs">
        {row.original.description}
      </span>
    ),
  },
  {
    accessorKey: 'location',
    header: 'Место',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.location ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const s = row.original.status;
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ENTRY_STATUS_CLASS[s]}`}>
          {ENTRY_STATUS_LABELS[s]}
        </span>
      );
    },
  },
  {
    id: 'author',
    header: 'Автор',
    cell: ({ row }) => {
      const a = row.original.author;
      return (
        <span className="text-sm text-muted-foreground">
          {[a.lastName, a.firstName].filter(Boolean).join(' ') || '—'}
        </span>
      );
    },
  },
  {
    id: 'remarks',
    header: 'Замечания',
    cell: ({ row }) => {
      const count = row.original._count.remarks;
      if (count === 0) return <span className="text-sm text-muted-foreground">—</span>;
      return (
        <span className="inline-flex items-center gap-1 text-sm text-amber-700">
          <MessageSquare className="h-3.5 w-3.5" />
          {count}
        </span>
      );
    },
  },
];

const STATUS_OPTIONS = Object.keys(ENTRY_STATUS_LABELS) as JournalEntryStatus[];

// === Компонент ===

interface Props {
  entries: JournalEntryItem[];
  isLoading: boolean;
  statusFilter: JournalEntryStatus | '';
  onStatusFilterChange: (v: JournalEntryStatus | '') => void;
  hasFilters: boolean;
  onResetFilters: () => void;
  onRowClick: (entry: JournalEntryItem) => void;
}

export function JournalEntryList({
  entries,
  isLoading,
  statusFilter,
  onStatusFilterChange,
  hasFilters,
  onResetFilters,
  onRowClick,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Фильтры */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Статус записи</Label>
          <Select
            value={statusFilter || 'ALL'}
            onValueChange={(v) => onStatusFilterChange(v === 'ALL' ? '' : v as JournalEntryStatus)}
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все статусы</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {ENTRY_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onResetFilters} className="h-9 self-end">
            Сбросить
          </Button>
        )}
      </div>

      {/* Таблица */}
      {isLoading ? (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          Загрузка записей...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">
            {hasFilters ? 'Записей по фильтру не найдено' : 'Записей пока нет. Добавьте первую запись.'}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          searchPlaceholder="Поиск по описанию..."
          searchColumn="description"
          onRowClick={onRowClick}
        />
      )}
    </div>
  );
}
