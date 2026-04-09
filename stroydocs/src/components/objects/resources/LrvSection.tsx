'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  useRequests,
  useCreateRequest,
  type MaterialRequestItem,
  type MaterialRequestStatus,
} from './usePlanning';

// ─── Статусы ЛРВ ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<MaterialRequestStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Подана',
  APPROVED: 'Согласована',
  IN_PROGRESS: 'В закупке',
  DELIVERED: 'Поставлена',
  CANCELLED: 'Отменена',
};

const STATUS_VARIANTS: Record<
  MaterialRequestStatus,
  'secondary' | 'default' | 'outline' | 'destructive'
> = {
  DRAFT: 'secondary',
  SUBMITTED: 'default',
  APPROVED: 'default',
  IN_PROGRESS: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
};

// ─── Колонки таблицы ─────────────────────────────────────────────────────────

const columns: ColumnDef<MaterialRequestItem>[] = [
  {
    accessorKey: 'number',
    header: 'Номер ЛРВ',
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.number}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const s = row.original.status;
      return (
        <Badge variant={STATUS_VARIANTS[s]} className="text-xs">
          {STATUS_LABELS[s]}
        </Badge>
      );
    },
  },
  {
    id: 'items',
    header: 'Позиций',
    accessorFn: (row) => row._count?.items ?? 0,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original._count?.items ?? 0}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Создана',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.createdAt), 'd MMM yyyy', { locale: ru })}
      </span>
    ),
  },
];

// ─── Компонент ───────────────────────────────────────────────────────────────

interface LrvSectionProps {
  objectId: string;
  onOpenWizard: () => void;
}

export function LrvSection({ objectId, onOpenWizard }: LrvSectionProps) {
  const { requests, isLoading } = useRequests(objectId);
  const createRequest = useCreateRequest(objectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [number, setNumber] = useState('');

  function handleCreate() {
    if (!number.trim()) return;
    createRequest.mutate(
      { number: number.trim() },
      { onSuccess: () => { setCreateOpen(false); setNumber(''); } }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Лимитно-разделительные ведомости</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onOpenWizard}>
            <Plus className="h-4 w-4 mr-1" />
            Из ГПР
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Создать ЛРВ
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
          Загрузка...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={requests}
          searchPlaceholder="Поиск по номеру..."
          searchColumn="number"
        />
      )}

      {/* Dialog: создать ЛРВ вручную */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новая ЛРВ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="lrv-number">Номер ЛРВ</Label>
              <Input
                id="lrv-number"
                placeholder="Например: ЛРВ-001"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!number.trim() || createRequest.isPending}
            >
              {createRequest.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
