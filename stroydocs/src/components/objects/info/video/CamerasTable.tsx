'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/shared/DataTable';
import type { VideoCamera } from './useCameras';

interface CamerasTableProps {
  cameras: VideoCamera[];
  onEdit: (camera: VideoCamera) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function CamerasTable({ cameras, onEdit, onDelete, isDeleting }: CamerasTableProps) {
  const columns: ColumnDef<VideoCamera, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'cameraNumber',
        header: 'Камера №',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? <span className="font-medium">{v}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'locationName',
        header: 'Наименование точки видеосъёмки',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ?? <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'operationalStatus',
        header: 'Состояние работоспособности',
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return (
            <Badge variant={v === 'Работает' ? 'default' : 'destructive'}>
              {v}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'cameraModel',
        header: 'Модель камеры',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ?? <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'httpUrl',
        header: 'Ссылка HTTP',
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return (
            <a
              href={v}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[200px]">{v}</span>
            </a>
          );
        },
      },
      {
        id: 'author',
        header: 'Автор',
        cell: ({ row }) => {
          const { firstName, lastName } = row.original.author;
          return `${firstName} ${lastName}`;
        },
      },
      {
        accessorKey: 'failureReason',
        header: 'Причина неработоспособности',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? (
            <span className="text-sm text-destructive">{v}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
                onClick={() => onDelete(row.original.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onEdit, onDelete, isDeleting]
  );

  return (
    <div className="overflow-x-auto">
      <DataTable columns={columns} data={cameras} />
    </div>
  );
}
