'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  JOURNAL_STATUS_LABELS,
  type JournalListItem,
} from './journal-constants';
import { JournalStatusBadge } from './JournalStatusBadge';
import { JournalTypeBadge } from './JournalTypeBadge';
import { useJournalRegistry } from './useJournalRegistry';
import { CreateJournalDialog } from './CreateJournalDialog';

// Типы ОЖР, отображаемые на этой вкладке
const OZR_TYPES: SpecialJournalType[] = ['OZR_1026PR', 'OZR_RD_11_05'];

const OZR_TYPE_OPTIONS: { value: SpecialJournalType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Все ОЖР' },
  { value: 'OZR_1026PR', label: 'ОЖР (1026/пр)' },
  { value: 'OZR_RD_11_05', label: 'ОЖР (РД 11-05)' },
];

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
    accessorKey: 'type',
    header: 'Форма',
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

// === Компонент ===

interface Props {
  objectId: string;
}

export function OzrListView({ objectId }: Props) {
  const router = useRouter();
  const vm = useJournalRegistry(objectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ozrTypeFilter, setOzrTypeFilter] = useState<SpecialJournalType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<JournalStatus | 'ALL'>('ALL');

  // Фильтрация клиентски: только OZR-типы, затем подтип и статус
  const filtered = vm.journals.filter((j) => {
    if (!OZR_TYPES.includes(j.type)) return false;
    if (ozrTypeFilter !== 'ALL' && j.type !== ozrTypeFilter) return false;
    if (statusFilter !== 'ALL' && j.status !== statusFilter) return false;
    return true;
  });

  const hasFilters = ozrTypeFilter !== 'ALL' || statusFilter !== 'ALL';

  function handleReset() {
    setOzrTypeFilter('ALL');
    setStatusFilter('ALL');
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Общий журнал работ (ОЖР)</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Создать ОЖР
        </Button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Форма</Label>
          <Select
            value={ozrTypeFilter}
            onValueChange={(v) => setOzrTypeFilter(v as SpecialJournalType | 'ALL')}
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OZR_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-9 self-end">
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
            Журналов ОЖР пока нет. Создайте первый общий журнал работ.
          </p>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Создать ОЖР
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
        defaultType="OZR_1026PR"
      />
    </div>
  );
}
