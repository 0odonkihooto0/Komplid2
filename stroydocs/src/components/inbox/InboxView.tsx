'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';
import type { InboxItem } from '@/app/api/inbox/route';

// ─── Хук данных ──────────────────────────────────────────────────────────────

function useInbox() {
  return useQuery<InboxItem[]>({
    queryKey: ['inbox'],
    queryFn: async () => {
      const res = await fetch('/api/inbox');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 30000,
  });
}

// ─── Колонки таблицы ──────────────────────────────────────────────────────────

function useColumns(onNavigate: (link: string) => void): ColumnDef<InboxItem, unknown>[] {
  return useMemo(
    () => [
      {
        accessorKey: 'typeLabel',
        header: 'Тип документа',
        cell: ({ row }) => (
          <Badge variant="secondary" className="whitespace-nowrap text-xs">
            {row.original.typeLabel}
          </Badge>
        ),
      },
      {
        accessorKey: 'objectName',
        header: 'Объект',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.objectName}</span>
        ),
      },
      {
        accessorKey: 'documentName',
        header: 'Наименование',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.documentName}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Дата',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(row.original.link);
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onNavigate]
  );
}

// ─── Группировка ─────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['ИД', 'Переписка', 'СЭД', 'ПИР', 'Журналы'];

function groupByCategory(items: InboxItem[]): [string, InboxItem[]][] {
  const map: Record<string, InboxItem[]> = {};
  for (const item of items) {
    if (!map[item.category]) map[item.category] = [];
    map[item.category].push(item);
  }
  return CATEGORY_ORDER
    .filter((cat) => map[cat]?.length)
    .map((cat) => [cat, map[cat]]);
}

// ─── Компонент ───────────────────────────────────────────────────────────────

export function InboxView() {
  const router = useRouter();
  const { data, isLoading, isError } = useInbox();
  const columns = useColumns((link) => router.push(link));

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">Не удалось загрузить входящие документы.</p>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">Нет документов для согласования</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Здесь появятся документы, когда вас добавят в маршрут согласования
        </p>
      </div>
    );
  }

  const groups = groupByCategory(data);

  return (
    <div className="space-y-8">
      {groups.map(([category, items]) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {category} <span className="ml-1 text-xs font-normal">({items.length})</span>
          </h2>
          <DataTable
            columns={columns}
            data={items}
            searchPlaceholder="Поиск..."
            searchColumn="documentName"
            onRowClick={(row) => router.push(row.link)}
          />
        </section>
      ))}
    </div>
  );
}
