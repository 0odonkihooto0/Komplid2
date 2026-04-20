'use client';

import { useMemo, useState } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useGanttTasks } from './useGanttTasks';
import type { GanttTaskItem } from './ganttTypes';
import { formatDate } from '@/utils/format';
import { CreateGanttTaskDialog } from './CreateGanttTaskDialog';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  NOT_STARTED: { label: 'Не начата', variant: 'secondary' },
  IN_PROGRESS: { label: 'В работе', variant: 'default' },
  COMPLETED: { label: 'Завершена', variant: 'outline' },
  DELAYED: { label: 'Задержка', variant: 'destructive' },
  ON_HOLD: { label: 'Приостановлена', variant: 'secondary' },
};

const col = createColumnHelper<GanttTaskItem>();

interface Props {
  projectId: string;
  contractId: string;
  versionId: string;
}

export function GanttList({ projectId, contractId, versionId }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useGanttTasks(projectId, contractId, versionId);

  const columns = useMemo<ColumnDef<GanttTaskItem, unknown>[]>(
    () => [
      col.accessor('name', {
        header: 'Наименование',
        cell: ({ row }) => (
          <span style={{ paddingLeft: `${row.original.level * 16}px` }} className="text-sm">
            {row.original.level === 0 && (
              <span className="mr-1 font-semibold text-muted-foreground">▸</span>
            )}
            {row.original.name}
          </span>
        ),
      }),
      col.accessor('status', {
        header: 'Статус',
        cell: ({ getValue }) => {
          const s = STATUS_LABELS[getValue()] ?? { label: getValue(), variant: 'secondary' as const };
          return <Badge variant={s.variant}>{s.label}</Badge>;
        },
      }),
      col.accessor('planStart', {
        header: 'Начало план',
        cell: ({ getValue }) => formatDate(new Date(getValue())),
      }),
      col.accessor('planEnd', {
        header: 'Конец план',
        cell: ({ getValue }) => formatDate(new Date(getValue())),
      }),
      col.accessor('factStart', {
        header: 'Начало факт',
        cell: ({ getValue }) => {
          const v = getValue();
          return v ? formatDate(new Date(v)) : '—';
        },
      }),
      col.accessor('factEnd', {
        header: 'Конец факт',
        cell: ({ getValue }) => {
          const v = getValue();
          return v ? formatDate(new Date(v)) : '—';
        },
      }),
      col.accessor('progress', {
        header: 'Прогресс',
        cell: ({ getValue }) => (
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${getValue()}%` }}
              />
            </div>
            <span className="text-xs">{Math.round(getValue())}%</span>
          </div>
        ),
      }),
      col.accessor('isCritical', {
        header: 'КП',
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="destructive" className="text-xs">КП</Badge>
          ) : null,
      }),
      col.accessor('workItem', {
        header: 'Вид работ',
        cell: ({ getValue }) => {
          const wi = getValue();
          return wi ? (
            <span className="text-xs text-muted-foreground">{wi.projectCipher} {wi.name}</span>
          ) : null;
        },
      }),
    ],
    [],
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить задачу
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data.tasks}
        searchPlaceholder="Поиск по наименованию..."
        searchColumn="name"
      />
      <CreateGanttTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        contractId={contractId}
        versionId={versionId}
        parentTasks={data.tasks.filter((t) => t.level === 0)}
      />
    </div>
  );
}
