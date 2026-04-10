'use client';

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Paperclip, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { RegistryDocument } from './useDocumentsRegistry';

// Карта цветов статусов
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Черновик: 'secondary',
  Подписано: 'default',
  Отклонено: 'destructive',
  'На проверке': 'outline',
  'На согласовании': 'outline',
  Утверждён: 'default',
  Активно: 'default',
  Закрыто: 'secondary',
  Согласовано: 'default',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

interface DocumentRegistryTableProps {
  documents: RegistryDocument[];
  isLoading: boolean;
  onRowClick?: (doc: RegistryDocument) => void;
}

export function DocumentRegistryTable({
  documents,
  isLoading,
  onRowClick,
}: DocumentRegistryTableProps) {
  const columns = useMemo<ColumnDef<RegistryDocument>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
            aria-label="Выбрать все"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Выбрать строку"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 40,
      },
      {
        id: 'hasFile',
        header: '',
        cell: ({ row }) =>
          row.original.hasFile ? (
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          ) : null,
        size: 32,
      },
      {
        accessorKey: 'status',
        header: 'Статус',
        cell: ({ getValue }) => {
          const val = getValue<string | null>();
          if (!val) return <span className="text-muted-foreground">—</span>;
          return (
            <Badge variant={STATUS_VARIANT[val] ?? 'secondary'} className="whitespace-nowrap">
              {val}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'type',
        header: 'Тип',
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'number',
        header: 'Номер',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue<string | null>() ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Дата',
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-sm">{formatDate(getValue<string | null>())}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Наименование',
        cell: ({ getValue }) => (
          <span className="line-clamp-2 text-sm">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'version',
        header: 'Версия',
        cell: ({ getValue }) => {
          const v = getValue<number | null>();
          return <span className="text-sm">{v !== null ? `v${v}` : '—'}</span>;
        },
      },
      {
        accessorKey: 'activeComments',
        header: 'Замечания',
        cell: ({ getValue }) => {
          const count = getValue<number>();
          if (count === 0) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
              <MessageSquare className="h-3.5 w-3.5" />
              {count}
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Документы не найдены
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((hg) => (
          <TableRow key={hg.id}>
            {hg.headers.map((h) => (
              <TableHead key={h.id} style={{ width: h.column.columnDef.size }}>
                {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onRowClick?.(row.original)}
            data-state={row.getIsSelected() ? 'selected' : undefined}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
