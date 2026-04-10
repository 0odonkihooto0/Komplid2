'use client';

import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, FileSpreadsheet, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DataTable } from '@/components/shared/DataTable';
import { useLandPlots, type LandPlot } from './useLandPlots';
import { AddLandPlotDialog } from './AddLandPlotDialog';
import { ImportLandPlotsDialog } from './ImportLandPlotsDialog';
import { LandPlotCard } from './LandPlotCard';

interface Props {
  projectId: string;
}

export function LandPlotsView({ projectId }: Props) {
  const { landPlots, isLoading, deleteMutation } = useLandPlots(projectId);

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<LandPlot | null>(null);

  const columns: ColumnDef<LandPlot, unknown>[] = useMemo(() => [
    {
      accessorKey: 'cadastralNumber',
      header: 'Кадастровый номер',
      cell: ({ row }) => (
        <button
          className="text-primary hover:underline font-medium text-left"
          onClick={() => setSelectedPlot(row.original)}
        >
          {row.original.cadastralNumber}
        </button>
      ),
    },
    {
      id: 'ownerOrg',
      header: 'Правообладатель',
      cell: ({ row }) => row.original.ownerOrg?.name ?? '—',
    },
    {
      id: 'tenantOrg',
      header: 'Арендатор',
      cell: ({ row }) => row.original.tenantOrg?.name ?? '—',
    },
    {
      accessorKey: 'address',
      header: 'Адрес',
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
    },
    {
      accessorKey: 'area',
      header: 'Площадь, кв.м.',
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return v != null ? v.toLocaleString('ru-RU') : '—';
      },
    },
    {
      accessorKey: 'landCategory',
      header: 'Категория земель',
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
    },
    {
      accessorKey: 'permittedUse',
      header: 'Вид разрешённого использования',
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        if (!v) return '—';
        return <span className="block max-w-[200px] truncate" title={v}>{v}</span>;
      },
    },
    {
      accessorKey: 'cadastralValue',
      header: 'Кадастровая стоимость, руб.',
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return v != null ? v.toLocaleString('ru-RU') : '—';
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить участок?</AlertDialogTitle>
              <AlertDialogDescription>
                Земельный участок {row.original.cadastralNumber} будет удалён безвозвратно.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate(row.original.id)}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ], [deleteMutation]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Земельные участки</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Импорт xlsx
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.print()} title="Печать">
            <Printer className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={isLoading ? [] : landPlots}
        searchColumn="cadastralNumber"
        searchPlaceholder="Поиск по кадастровому номеру..."
      />

      <AddLandPlotDialog open={addOpen} onOpenChange={setAddOpen} projectId={projectId} />

      <ImportLandPlotsDialog open={importOpen} onOpenChange={setImportOpen} projectId={projectId} />

      <LandPlotCard
        plot={selectedPlot}
        open={selectedPlot !== null}
        onOpenChange={(open) => { if (!open) setSelectedPlot(null); }}
        projectId={projectId}
      />
    </div>
  );
}
