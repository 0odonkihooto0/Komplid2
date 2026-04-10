'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { useTechnicalConditions, type TechnicalCondition } from './useTechnicalConditions';
import { AddTechnicalConditionDialog } from './AddTechnicalConditionDialog';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

function truncate(text: string | null, max = 40): string {
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

interface Props {
  projectId: string;
}

export function TechnicalConditionsView({ projectId }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const { technicalConditions, isLoading, deleteMutation } = useTechnicalConditions(projectId);

  const columns: ColumnDef<TechnicalCondition>[] = [
    {
      accessorKey: 'landPlot',
      header: 'Участок',
      cell: ({ row }) => row.original.landPlot?.cadastralNumber ?? '—',
    },
    {
      accessorKey: 'type',
      header: 'Тип',
    },
    {
      accessorKey: 'connectionAvailability',
      header: 'Наличие условий подключения',
      cell: ({ row }) => row.original.connectionAvailability ?? '—',
    },
    {
      accessorKey: 'issueDate',
      header: 'Дата выдачи',
      cell: ({ row }) => formatDate(row.original.issueDate),
    },
    {
      accessorKey: 'number',
      header: 'Номер',
      cell: ({ row }) => row.original.number ?? '—',
    },
    {
      accessorKey: 'expirationDate',
      header: 'Дата окончания',
      cell: ({ row }) => formatDate(row.original.expirationDate),
    },
    {
      accessorKey: 'responsibleOrg',
      header: 'Ответственный',
      cell: ({ row }) => row.original.responsibleOrg?.name ?? '—',
    },
    {
      accessorKey: 'issuingAuthority',
      header: 'Выдавший орган',
      cell: ({ row }) => row.original.issuingAuthority ?? '—',
    },
    {
      accessorKey: 'connectionConditions',
      header: 'Условия подключения',
      cell: ({ row }) => truncate(row.original.connectionConditions),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={deleteMutation.isPending}
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Удалить технические условия?')) {
              deleteMutation.mutate(row.original.id);
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Технические условия</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : (
        <DataTable
          columns={columns}
          data={technicalConditions}
          searchColumn="type"
          searchPlaceholder="Поиск по типу..."
        />
      )}

      <AddTechnicalConditionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
      />
    </div>
  );
}
