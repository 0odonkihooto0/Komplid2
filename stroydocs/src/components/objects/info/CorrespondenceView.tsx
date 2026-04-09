'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Mail, Search, AlertCircle } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { CreateCorrespondenceDialog } from './CreateCorrespondenceDialog';
import {
  useCorrespondenceList,
  type CorrespondenceListItem,
  type CorrespondenceDirection,
  type CorrespondenceStatus,
} from './useCorrespondenceList';

const STATUS_LABELS: Record<CorrespondenceStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  DRAFT:       { label: 'Черновик',         variant: 'outline' },
  SENT:        { label: 'Отправлено',        variant: 'default' },
  READ:        { label: 'Прочитано',         variant: 'success' },
  IN_APPROVAL: { label: 'На согласовании',   variant: 'warning' },
  APPROVED:    { label: 'Согласовано',       variant: 'success' },
  REJECTED:    { label: 'Отклонено',         variant: 'destructive' },
  ARCHIVED:    { label: 'Архив',             variant: 'secondary' },
};

const STATUS_OPTIONS: { value: CorrespondenceStatus | ''; label: string }[] = [
  { value: '', label: 'Все статусы' },
  { value: 'DRAFT', label: 'Черновик' },
  { value: 'SENT', label: 'Отправлено' },
  { value: 'READ', label: 'Прочитано' },
  { value: 'IN_APPROVAL', label: 'На согласовании' },
  { value: 'APPROVED', label: 'Согласовано' },
  { value: 'REJECTED', label: 'Отклонено' },
  { value: 'ARCHIVED', label: 'Архив' },
];

const DIRECTION_TABS: { value: CorrespondenceDirection | ''; label: string }[] = [
  { value: '', label: 'Все' },
  { value: 'OUTGOING', label: '→ Исходящие' },
  { value: 'INCOMING', label: '← Входящие' },
];

const columns: ColumnDef<CorrespondenceListItem>[] = [
  { accessorKey: 'number', header: '№ письма', size: 140 },
  {
    id: 'direction',
    header: 'Направление',
    cell: ({ row }) => row.original.direction === 'OUTGOING'
      ? <span className="text-blue-600 font-medium">→ Исходящее</span>
      : <span className="text-muted-foreground font-medium">← Входящее</span>,
  },
  {
    id: 'counterparty',
    header: 'Контрагент',
    cell: ({ row }) => {
      const item = row.original;
      const org = item.direction === 'OUTGOING' ? item.receiverOrg : item.senderOrg;
      return <span className="text-sm">{org.name}</span>;
    },
  },
  { accessorKey: 'subject', header: 'Тема' },
  {
    id: 'date',
    header: 'Дата',
    cell: ({ row }) => {
      const date = row.original.sentAt ?? row.original.createdAt;
      return <span className="text-sm tabular-nums">{new Date(date).toLocaleDateString('ru-RU')}</span>;
    },
  },
  {
    id: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const s = STATUS_LABELS[row.original.status];
      return <Badge variant={s.variant}>{s.label}</Badge>;
    },
  },
];

export function CorrespondenceView({ objectId }: { objectId: string }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const {
    items, isLoading, error, direction, setDirection, status, setStatus, setSearch,
  } = useCorrespondenceList(objectId);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" aria-label="Ошибка загрузки" />
        <p className="text-sm text-destructive">Не удалось загрузить переписку</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  // Debounce поиска через state отдельно от хука
  const handleSearch = (value: string) => {
    setSearchInput(value);
    setSearch(value);
  };

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Деловая переписка</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Создать письмо
        </Button>
      </div>

      {/* Панель фильтров */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Вкладки направления */}
        <div className="flex rounded-md border overflow-hidden text-sm">
          {DIRECTION_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              onClick={() => setDirection(tab.value ? (tab.value as CorrespondenceDirection) : null)}
              className={`px-3 py-1.5 transition-colors ${direction === (tab.value || null)
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Фильтр статуса */}
        <Select
          value={status ?? '_all'}
          onValueChange={(v) => setStatus(v === '_all' ? null : (v as CorrespondenceStatus))}
        >
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || '_all'} value={opt.value || '_all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Поиск */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" aria-label="Поиск" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Поиск по теме..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Загрузка */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
        </div>
      )}

      {/* Пустое состояние */}
      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Mail className="h-5 w-5 text-muted-foreground" aria-label="Нет писем" />
          </div>
          <p className="text-sm font-medium">Писем нет</p>
          <p className="text-xs text-muted-foreground mt-1">Создайте первое письмо, нажав «Создать письмо»</p>
        </div>
      )}

      {/* Таблица */}
      {!isLoading && items.length > 0 && (
        <DataTable
          columns={columns}
          data={items}
          onRowClick={(row) => router.push(`/objects/${objectId}/info/correspondence/${row.id}`)}
        />
      )}

      <CreateCorrespondenceDialog open={dialogOpen} onOpenChange={setDialogOpen} objectId={objectId} />
    </div>
  );
}
