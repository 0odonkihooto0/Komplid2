'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Trash2, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import {
  useBimAccess,
  useDeleteBimAccess,
  ACCESS_LEVEL_LABELS,
  STAGE_LABELS,
  type BimAccessItem,
} from './useBimAccess';
import { AddBimAccessDialog } from './AddBimAccessDialog';

// ─── Вспомогательная функция ─────────────────────────────────────────────────

function AccessLevelBadge({ level }: { level: BimAccessItem['level'] }) {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    DELETE: 'default',
    EDIT: 'secondary',
    ADD: 'secondary',
    VIEW: 'outline',
  };
  return (
    <Badge variant={variants[level] ?? 'outline'}>{ACCESS_LEVEL_LABELS[level]}</Badge>
  );
}

// ─── Компонент ────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
}

export function BimAccessSettings({ projectId }: Props) {
  const { accessList, isLoading } = useBimAccess(projectId);
  const deleteMutation = useDeleteBimAccess(projectId);

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BimAccessItem | null>(null);

  const columns = useMemo<ColumnDef<BimAccessItem>[]>(
    () => [
      {
        id: 'user',
        header: 'Пользователь',
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.user.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.user.email}</p>
          </div>
        ),
      },
      {
        id: 'stage',
        header: 'Стадия',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.stage ? STAGE_LABELS[row.original.stage] : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Статус модели',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.status ?? '—'}</span>
        ),
      },
      {
        id: 'level',
        header: 'Уровень доступа',
        cell: ({ row }) => <AccessLevelBadge level={row.original.level} />,
      },
      {
        id: 'delete-action',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row.original);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    []
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Настройки доступа к ЦИМ</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Права пользователей на просмотр и редактирование информационных моделей
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Добавить права
        </Button>
      </div>

      <DataTable columns={columns} data={accessList} />

      <AddBimAccessDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        entityName={deleteTarget ? `права ${ACCESS_LEVEL_LABELS[deleteTarget.level]} для ${deleteTarget.user.name}` : ''}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
