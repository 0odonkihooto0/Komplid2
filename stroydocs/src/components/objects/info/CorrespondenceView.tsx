'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Mail, AlertCircle } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/shared/DataTable';
import { AddCorrespondenceDialog } from './AddCorrespondenceDialog';
import {
  useCorrespondenceList,
  type CorrespondenceListItem,
  type CorrespondenceStatus,
} from './useCorrespondenceList';

const OTHER_STATUS_LABELS: Partial<Record<CorrespondenceStatus, string>> = {
  DRAFT:       'Черновик',
  IN_APPROVAL: 'На согласовании',
  APPROVED:    'Согласовано',
  REJECTED:    'Отклонено',
  ARCHIVED:    'Архив',
};

function StatusBadge({ status }: { status: CorrespondenceStatus }) {
  if (status === 'READ') return <Badge variant="success">Прочитано</Badge>;
  if (status === 'SENT') return <Badge variant="secondary">Не прочитано</Badge>;
  return <Badge variant="outline">{OTHER_STATUS_LABELS[status] ?? status}</Badge>;
}

const columns: ColumnDef<CorrespondenceListItem>[] = [
  {
    id: 'object',
    header: 'Объект',
    cell: ({ row }) => (
      <span className="text-sm truncate max-w-[140px] block">{row.original.buildingObject.name}</span>
    ),
  },
  {
    accessorKey: 'subject',
    header: 'Заголовок',
    cell: ({ row }) => (
      <span className="text-sm font-medium truncate max-w-[200px] block">{row.original.subject}</span>
    ),
  },
  {
    id: 'senderOrg',
    header: 'Компания отправитель',
    cell: ({ row }) => <span className="text-sm">{row.original.senderOrg.name}</span>,
  },
  {
    id: 'author',
    header: 'Автор',
    cell: ({ row }) => {
      const { firstName, lastName } = row.original.author;
      return <span className="text-sm whitespace-nowrap">{firstName} {lastName}</span>;
    },
  },
  {
    id: 'receiverOrg',
    header: 'Получатель',
    cell: ({ row }) => <span className="text-sm">{row.original.receiverOrg.name}</span>,
  },
  {
    accessorKey: 'number',
    header: '№ письма',
    size: 130,
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.number}</span>,
  },
  {
    id: 'status',
    header: 'Статус',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'createdAt',
    header: 'Создан',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums whitespace-nowrap">
        {new Date(row.original.createdAt).toLocaleDateString('ru-RU')}
      </span>
    ),
  },
  {
    id: 'updatedAt',
    header: 'Время изменения статуса',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums whitespace-nowrap">
        {new Date(row.original.updatedAt).toLocaleDateString('ru-RU')}
      </span>
    ),
  },
];

export function CorrespondenceView({ objectId }: { objectId: string }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { items, isLoading, error } = useCorrespondenceList(objectId);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" aria-label="Ошибка загрузки" />
        <p className="text-sm text-destructive">Не удалось загрузить переписку</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Деловая переписка</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить документ
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Mail className="h-5 w-5 text-muted-foreground" aria-label="Нет писем" />
          </div>
          <p className="text-sm font-medium">Писем нет</p>
          <p className="text-xs text-muted-foreground mt-1">
            Нажмите «+ Добавить документ», чтобы создать первое письмо
          </p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <DataTable
          columns={columns}
          data={items}
          onRowClick={(row) => router.push(`/objects/${objectId}/info/correspondence/${row.id}`)}
        />
      )}

      <AddCorrespondenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        objectId={objectId}
      />
    </div>
  );
}
