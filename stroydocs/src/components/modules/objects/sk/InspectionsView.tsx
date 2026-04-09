'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { ClipboardCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { StartInspectionDialog } from './StartInspectionDialog';
import { useInspections, type InspectionListItem } from './useInspections';
import { formatDate } from '@/utils/format';

interface Props {
  objectId: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активна',
  COMPLETED: 'Завершена',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  COMPLETED: 'secondary',
};

export function InspectionsView({ objectId }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filters = useMemo(
    () => (statusFilter !== 'all' ? { status: statusFilter } : {}),
    [statusFilter],
  );

  const { data, isLoading } = useInspections(objectId, filters);
  const inspections = data?.data ?? [];

  const columns: ColumnDef<InspectionListItem, unknown>[] = useMemo(() => [
    {
      accessorKey: 'number',
      header: '№',
      size: 100,
    },
    {
      accessorKey: 'inspector',
      header: 'Проверяющий',
      cell: ({ row }) => {
        const u = row.original.inspector;
        return `${u.lastName} ${u.firstName}`;
      },
    },
    {
      accessorKey: 'responsible',
      header: 'Ответственный',
      cell: ({ row }) => {
        const u = row.original.responsible;
        return u ? `${u.lastName} ${u.firstName}` : '—';
      },
    },
    {
      id: 'dates',
      header: 'Даты',
      cell: ({ row }) => {
        const { startedAt, completedAt } = row.original;
        if (completedAt) {
          return `${formatDate(startedAt)} — ${formatDate(completedAt)}`;
        }
        return `с ${formatDate(startedAt)}`;
      },
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={STATUS_VARIANTS[status] ?? 'outline'}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
        );
      },
    },
    {
      id: 'defects',
      header: 'Недостатки',
      cell: ({ row }) => {
        const count = row.original._count.defects;
        return (
          <span className="flex items-center gap-1.5">
            {count > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
            {count}
          </span>
        );
      },
    },
  ], []);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Проверки</h2>
          <span className="text-sm text-muted-foreground">({data?.total ?? 0})</span>
        </div>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="ACTIVE">Активные</SelectItem>
              <SelectItem value="COMPLETED">Завершённые</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setDialogOpen(true)}>
            Начать проверку
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={inspections}
        searchPlaceholder="Поиск по номеру..."
        searchColumn="number"
        onRowClick={(row) => router.push(`/objects/${objectId}/sk/inspections/${row.id}`)}
      />

      <StartInspectionDialog
        objectId={objectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
