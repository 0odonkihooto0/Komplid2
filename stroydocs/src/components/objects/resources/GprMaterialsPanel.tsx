'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/DataTable';
import { cn } from '@/lib/utils';
import { useGanttVersions, useGprMaterials, type GprMaterialItem } from './usePlanning';

// ─── Колонки таблицы ─────────────────────────────────────────────────────────

const columns: ColumnDef<GprMaterialItem>[] = [
  {
    accessorKey: 'materialName',
    header: 'Наименование',
    cell: ({ row }) => <span className="text-sm">{row.original.materialName}</span>,
  },
  {
    accessorKey: 'materialUnit',
    header: 'Ед.',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.materialUnit ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'quantityRemaining',
    header: 'Кол-во по ГПР',
    cell: ({ row }) => (
      <span className="text-sm text-right block">{row.original.quantityRemaining}</span>
    ),
  },
  {
    id: 'warehouse',
    header: 'На складе',
    cell: () => (
      // Данные остатков склада появятся в Шаге 9 при расширении API
      <span className="text-sm text-muted-foreground text-right block">—</span>
    ),
  },
  {
    id: 'deficit',
    header: 'Дефицит',
    cell: ({ row }) => {
      // Дефицит = потребность - остаток склада.
      // Пока склад не интегрирован — показываем потребность как потенциальный дефицит
      const qty = row.original.quantityRemaining;
      return (
        <span
          className={cn(
            'text-sm text-right block font-medium',
            qty > 0 ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {qty > 0 ? qty : '—'}
        </span>
      );
    },
  },
  {
    accessorKey: 'ganttTaskName',
    header: 'Задача ГПР',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{row.original.ganttTaskName}</span>
    ),
  },
];

// ─── Компонент ────────────────────────────────────────────────────────────────

interface GprMaterialsPanelProps {
  objectId: string;
}

export function GprMaterialsPanel({ objectId }: GprMaterialsPanelProps) {
  const [versionId, setVersionId] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { versions, isLoading: versionsLoading } = useGanttVersions(objectId);
  const { materials, total, isLoading } = useGprMaterials(objectId, {
    ganttVersionId: versionId || null,
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Материалы из ГПР</h3>
        {versionId && (
          <span className="text-sm text-muted-foreground">Итого: {total} позиций</span>
        )}
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 min-w-[200px]">
          <Label className="text-xs">Версия ГПР</Label>
          <Select
            value={versionId}
            onValueChange={setVersionId}
            disabled={versionsLoading}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Выберите версию..." />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                  {v.isActive ? ' (активная)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Период с</Label>
          <Input
            type="date"
            className="h-8 text-sm w-36"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">по</Label>
          <Input
            type="date"
            className="h-8 text-sm w-36"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {/* Таблица */}
      {!versionId ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground border rounded-md">
          Выберите версию ГПР для отображения материалов
        </div>
      ) : isLoading ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
          Загрузка...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={materials}
          searchPlaceholder="Поиск по наименованию..."
          searchColumn="materialName"
        />
      )}
    </div>
  );
}
