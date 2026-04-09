'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Search, AlertCircle } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { CreateSEDDialog } from './CreateSEDDialog';
import {
  useSEDList,
  type SEDListItem,
  type SEDView as SEDViewFilter,
  type SEDStatus,
  type SEDDocType,
} from './useSEDList';

const DOC_TYPE_LABELS: Record<SEDDocType, string> = {
  LETTER: 'Письмо', ORDER: 'Приказ', PROTOCOL: 'Протокол',
  ACT: 'Акт', MEMO: 'Докладная', NOTIFICATION: 'Уведомление', OTHER: 'Иное',
};

const STATUS_LABELS: Record<SEDStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  DRAFT:           { label: 'Черновик',          variant: 'outline' },
  ACTIVE:          { label: 'Активный',          variant: 'default' },
  IN_APPROVAL:     { label: 'На согласовании',   variant: 'warning' },
  REQUIRES_ACTION: { label: 'Требует действия',  variant: 'warning' },
  APPROVED:        { label: 'Согласован',        variant: 'success' },
  REJECTED:        { label: 'Отклонён',          variant: 'destructive' },
  ARCHIVED:        { label: 'Архив',             variant: 'secondary' },
};

const SIDEBAR_VIEWS: { view: SEDViewFilter; label: string }[] = [
  { view: 'all',      label: 'Все документы' },
  { view: 'active',   label: 'Активные' },
  { view: 'requires', label: 'Требуют действия' },
  { view: 'my',       label: 'Мои документы' },
  { view: 'sent',     label: 'Отправленные' },
];

const columns: ColumnDef<SEDListItem>[] = [
  { accessorKey: 'number', header: '№', size: 120 },
  {
    id: 'docType',
    header: 'Тип',
    cell: ({ row }) => <span className="text-sm">{DOC_TYPE_LABELS[row.original.docType]}</span>,
    size: 110,
  },
  { accessorKey: 'title', header: 'Заголовок' },
  {
    id: 'date',
    header: 'Дата',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {new Date(row.original.createdAt).toLocaleDateString('ru-RU')}
      </span>
    ),
    size: 100,
  },
  {
    id: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const s = STATUS_LABELS[row.original.status];
      return <Badge variant={s.variant}>{s.label}</Badge>;
    },
    size: 150,
  },
];

export function SEDView({ objectId }: { objectId: string }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const { items, isLoading, error, view, setView, status, setStatus, docType, setDocType, setSearch } =
    useSEDList(objectId);

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setSearch(value);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" aria-label="Ошибка загрузки" />
        <p className="text-sm text-destructive">Не удалось загрузить документы СЭД</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 min-h-0">
      {/* Левая панель — разделы */}
      <aside className="w-52 shrink-0 space-y-0.5">
        {SIDEBAR_VIEWS.map((item) => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
              view === item.view ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {item.label}
          </button>
        ))}
      </aside>

      {/* Правая панель */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">СЭД</h2>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Создать документ
          </Button>
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={docType ?? '_all'}
            onValueChange={(v) => setDocType(v === '_all' ? null : (v as SEDDocType))}
          >
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Все типы" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Все типы</SelectItem>
              {(Object.keys(DOC_TYPE_LABELS) as SEDDocType[]).map((t) => (
                <SelectItem key={t} value={t}>{DOC_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status ?? '_all'}
            onValueChange={(v) => setStatus(v === '_all' ? null : (v as SEDStatus))}
          >
            <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Все статусы" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Все статусы</SelectItem>
              {(Object.keys(STATUS_LABELS) as SEDStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" aria-label="Поиск" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Поиск по заголовку..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" aria-label="Нет документов" />
            </div>
            <p className="text-sm font-medium">Документов нет</p>
            <p className="text-xs text-muted-foreground mt-1">
              Создайте первый документ, нажав «Создать документ»
            </p>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(row) => router.push(`/objects/${objectId}/sed/${row.id}`)}
          />
        )}
      </div>

      <CreateSEDDialog open={dialogOpen} onOpenChange={setDialogOpen} objectId={objectId} />
    </div>
  );
}
