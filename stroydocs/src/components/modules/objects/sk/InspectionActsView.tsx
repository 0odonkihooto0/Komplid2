'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { FileCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/format';
import { useInspectionActs, type InspectionActListItem } from './useInspectionActs';

interface Props {
  objectId: string;
}

export function InspectionActsView({ objectId }: Props) {
  const router = useRouter();
  const { data, isLoading } = useInspectionActs(objectId);
  const acts = data?.data ?? [];

  const columns: ColumnDef<InspectionActListItem, unknown>[] = useMemo(() => [
    {
      accessorKey: 'number',
      header: '№',
      size: 100,
    },
    {
      id: 'inspection',
      header: 'Проверка',
      cell: ({ row }) => {
        const { inspection } = row.original;
        return (
          <button
            className="text-blue-600 hover:underline text-sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/objects/${objectId}/sk/inspections/${inspection.id}`);
            }}
          >
            №{inspection.number}
          </button>
        );
      },
    },
    {
      id: 'inspector',
      header: 'Проверяющий',
      cell: ({ row }) => {
        const u = row.original.inspection.inspector;
        return `${u.lastName} ${u.firstName}`;
      },
    },
    {
      id: 'issuedAt',
      header: 'Дата выдачи',
      cell: ({ row }) => formatDate(row.original.issuedAt),
    },
    {
      id: 'pdf',
      header: '',
      size: 80,
      cell: ({ row }) => (
        <Button variant="outline" size="sm" asChild>
          <a
            href={`/api/projects/${objectId}/inspection-acts/${row.original.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-4 w-4 mr-1.5" />
            PDF
          </a>
        </Button>
      ),
    },
  ], [objectId, router]);

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
      <div className="flex items-center gap-2">
        <FileCheck className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Акты проверки</h2>
        <span className="text-sm text-muted-foreground">({data?.total ?? 0})</span>
      </div>

      <DataTable
        columns={columns}
        data={acts}
        searchPlaceholder="Поиск по номеру..."
        searchColumn="number"
      />
    </div>
  );
}
