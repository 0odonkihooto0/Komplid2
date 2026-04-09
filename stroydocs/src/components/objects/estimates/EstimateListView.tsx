'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Upload, PlusCircle, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { ImportEstimateDialog } from '@/components/modules/estimates/ImportEstimateDialog';
import { CreateVersionDialog } from './CreateVersionDialog';
import { useEstimateVersions, type EstimateVersionItem } from '@/hooks/useEstimateVersions';
import { formatDate } from '@/utils/format';

// Цвета и иконки типов версий
const VERSION_TYPE_CONFIG = {
  BASELINE: { label: 'Базовая', variant: 'default' as const, icon: '📌' },
  ACTUAL: { label: 'Актуальная', variant: 'secondary' as const, icon: '✓' },
  CORRECTIVE: { label: 'Корректировка', variant: 'outline' as const, icon: '✏️' },
};

// Форматирование суммы в рублях
const formatRub = (amount: number | null) => {
  if (amount === null) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
};

interface Props {
  objectId: string;
}

/** Реестр версий смет — вкладка «Сметы» (ШАГ 5) */
export function EstimateListView({ objectId }: Props) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const {
    contracts,
    contractsLoading,
    selectedContractId,
    setSelectedContractId,
    versions,
    createVersion,
    setActual,
    setBaseline,
    copyVersion,
    recalculate,
    deleteVersion,
  } = useEstimateVersions(objectId);

  const columns: ColumnDef<EstimateVersionItem, unknown>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Название версии',
      cell: ({ row }) => (
        <button
          className="text-left font-medium hover:underline text-primary"
          onClick={() => router.push(`/objects/${objectId}/estimates/${row.original.id}?contractId=${selectedContractId ?? ''}`)}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: 'versionType',
      header: 'Тип',
      cell: ({ getValue }) => {
        const type = getValue() as keyof typeof VERSION_TYPE_CONFIG;
        const cfg = VERSION_TYPE_CONFIG[type];
        return (
          <Badge variant={cfg.variant} className="gap-1">
            <span>{cfg.icon}</span>
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Итоговая сумма',
      cell: ({ getValue }) => (
        <span className="tabular-nums">{formatRub(getValue() as number | null)}</span>
      ),
    },
    {
      accessorKey: 'period',
      header: 'Период',
      cell: ({ getValue }) => getValue() ?? '—',
    },
    {
      accessorKey: 'isActual',
      header: 'Актуальная',
      cell: ({ getValue }) => (
        <Checkbox checked={getValue() as boolean} disabled aria-label="Актуальная версия" />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Создана',
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const v = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/objects/${objectId}/estimates/${v.id}?contractId=${selectedContractId ?? ''}`)}>
                Открыть
              </DropdownMenuItem>
              {!v.isActual && (
                <DropdownMenuItem onClick={() => setActual.mutate(v.id)}>
                  Сделать актуальной
                </DropdownMenuItem>
              )}
              {!v.isBaseline && (
                <DropdownMenuItem onClick={() => setBaseline.mutate(v.id)}>
                  Сделать базовой
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => copyVersion.mutate(v.id)}>
                Создать копию
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => recalculate.mutate(v.id)}>
                Пересчитать
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                disabled={v.isBaseline}
                onClick={() => {
                  if (confirm(`Удалить версию «${v.name}»?`)) deleteVersion.mutate(v.id);
                }}
              >
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [router, objectId, selectedContractId, setActual, setBaseline, copyVersion, recalculate, deleteVersion]);

  return (
    <div className="space-y-4">
      {/* Шапка: выбор договора + кнопки */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Договор:</span>
          <Select
            value={selectedContractId ?? ''}
            onValueChange={setSelectedContractId}
            disabled={contractsLoading || contracts.length === 0}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder={contractsLoading ? 'Загрузка...' : 'Выберите договор'} />
            </SelectTrigger>
            <SelectContent>
              {contracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.number ? `${c.number} — ` : ''}{c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedContractId}
            onClick={() => setImportOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Импортировать смету
          </Button>
          <Button
            size="sm"
            disabled={!selectedContractId}
            onClick={() => setCreateOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Создать вручную
          </Button>
        </div>
      </div>

      {/* Двухколоночный layout */}
      <div className="flex gap-4">
        {/* Левая панель — заглушка категорий */}
        <aside className="w-[200px] shrink-0 rounded-md border p-3 space-y-1">
          <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm font-medium bg-accent">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            Все разделы
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground text-xs"
            disabled
            title="В разработке"
          >
            + Создать категорию
          </Button>
        </aside>

        {/* Правая панель — таблица версий */}
        <div className="flex-1 min-w-0">
          {!selectedContractId ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Выберите договор для просмотра смет
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={versions}
              searchColumn="name"
              searchPlaceholder="Поиск по названию..."
            />
          )}
        </div>
      </div>

      {/* Диалог импорта */}
      {selectedContractId && (
        <ImportEstimateDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          projectId={objectId}
          contractId={selectedContractId}
        />
      )}

      {/* Диалог создания вручную */}
      <CreateVersionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (data) => {
          await createVersion.mutateAsync(data);
        }}
      />
    </div>
  );
}
