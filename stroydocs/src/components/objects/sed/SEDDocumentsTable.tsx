'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  type ColumnDef,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Plus, Search, Filter, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ColumnSettingsPanel } from './ColumnSettingsPanel';
import { SEDFilterPanel } from './SEDFilterPanel';
import {
  type SEDListItem,
  type SEDDocType,
  type SEDStatus,
  type SEDFilters,
  EMPTY_FILTERS,
} from './useSEDList';

const DOC_TYPE_LABELS: Record<SEDDocType, string> = {
  LETTER: 'Письмо', ORDER: 'Приказ', PROTOCOL: 'Протокол',
  ACT: 'Акт', MEMO: 'Докладная', NOTIFICATION: 'Уведомление', OTHER: 'Иное',
};

const STATUS_LABELS: Record<SEDStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  DRAFT:           { label: 'Черновик',         variant: 'outline' },
  ACTIVE:          { label: 'Активный',         variant: 'default' },
  IN_APPROVAL:     { label: 'На согласовании',  variant: 'warning' },
  REQUIRES_ACTION: { label: 'Требует действия', variant: 'warning' },
  APPROVED:        { label: 'Согласован',       variant: 'success' },
  REJECTED:        { label: 'Отклонён',         variant: 'destructive' },
  ARCHIVED:        { label: 'Архив',            variant: 'secondary' },
};

const CONFIGURABLE_COLUMNS = [
  { id: 'docType',     label: 'Тип' },
  { id: 'number',      label: 'Номер' },
  { id: 'title',       label: 'Заголовок' },
  { id: 'senderOrg',   label: 'Отправитель' },
  { id: 'receiverOrg', label: 'Получатель' },
  { id: 'date',        label: 'Дата' },
  { id: 'status',      label: 'Статус' },
  { id: 'tags',        label: 'Тэги' },
] as const;

interface Props {
  objectId: string;
  items: SEDListItem[];
  isLoading: boolean;
  total: number;
  filters: SEDFilters;
  onCreateDoc: () => void;
  onSearch: (search: string) => void;
  onFilterChange: (filters: SEDFilters) => void;
  onBulkMarkRead: (ids: string[], isRead: boolean) => void;
}

export function SEDDocumentsTable({
  objectId,
  items,
  isLoading,
  total,
  filters,
  onCreateDoc,
  onSearch,
  onFilterChange,
  onBulkMarkRead,
}: Props) {
  const router = useRouter();
  const storageKey = `sed-columns-${objectId}`;

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as VisibilityState) : {};
    } catch { return {}; }
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(columnVisibility)); } catch {}
  }, [columnVisibility, storageKey]);

  useEffect(() => {
    const t = setTimeout(() => onSearch(searchValue), 300);
    return () => clearTimeout(t);
  }, [searchValue, onSearch]);

  const columns = useMemo<ColumnDef<SEDListItem>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: 'docType',
      header: 'Тип',
      cell: ({ row }) => (
        <span className="text-sm">{DOC_TYPE_LABELS[row.original.docType]}</span>
      ),
      size: 110,
    },
    { accessorKey: 'number', header: '№', size: 120 },
    { accessorKey: 'title', header: 'Заголовок' },
    {
      id: 'senderOrg',
      header: 'Отправитель',
      cell: ({ row }) => (
        <span className="text-sm truncate block max-w-[160px]">{row.original.senderOrg.name}</span>
      ),
    },
    {
      id: 'receiverOrg',
      header: 'Получатель',
      cell: ({ row }) => (
        <span className="text-sm truncate block max-w-[160px]">
          {row.original.receiverOrg?.name ?? '—'}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Дата',
      cell: ({ row }) => {
        const d = row.original.date ?? row.original.createdAt;
        return (
          <span className="text-sm tabular-nums">
            {new Date(d).toLocaleDateString('ru-RU')}
          </span>
        );
      },
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
    {
      id: 'tags',
      header: 'Тэги',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: items,
    columns,
    state: { columnVisibility, rowSelection },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  });

  const visibleColumnsSet = useMemo(() => {
    const s = new Set<string>();
    for (const col of CONFIGURABLE_COLUMNS) {
      if (columnVisibility[col.id] !== false) s.add(col.id);
    }
    return s;
  }, [columnVisibility]);

  const handleToggleColumn = useCallback((id: string) => {
    table.getColumn(id)?.toggleVisibility();
  }, [table]);

  const handleResetColumns = useCallback(() => {
    setColumnVisibility({});
  }, []);

  const selectedDocIds = table.getSelectedRowModel().rows.map((r) => r.original.id);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
      {/* Панель инструментов */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button size="sm" onClick={onCreateDoc}>
          <Plus className="h-4 w-4 mr-1" />
          Создать документ
        </Button>

        <ColumnSettingsPanel
          columns={Array.from(CONFIGURABLE_COLUMNS)}
          visibleColumns={visibleColumnsSet}
          onToggle={handleToggleColumn}
          onReset={handleResetColumns}
        />

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFilterOpen(true)}>
          <Filter className="h-4 w-4" />
          Фильтры
        </Button>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Поиск..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        {selectedDocIds.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Действия ({selectedDocIds.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onBulkMarkRead(selectedDocIds, true)}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Прочитано
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkMarkRead(selectedDocIds, false)}>
                Не прочитано
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Скелетон загрузки */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      )}

      {/* Таблица */}
      {!isLoading && (
        <div className="rounded-md border overflow-auto flex-1">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead
                      key={h.id}
                      className="text-xs uppercase text-muted-foreground font-medium"
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'cursor-pointer hover:bg-muted/50 transition-colors border-b',
                      !row.original.isRead && 'font-semibold',
                    )}
                    onClick={() =>
                      router.push(`/objects/${objectId}/sed/${row.original.id}`)
                    }
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData('text/plain', row.original.id)
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2 px-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    Документов нет
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && total > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Всего: {total}</p>
      )}

      <SEDFilterPanel
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onApply={onFilterChange}
      />
    </div>
  );
}
