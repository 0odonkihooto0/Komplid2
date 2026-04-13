'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import {
  MOV_STATUS_LABELS,
  MOV_STATUS_CLASS,
  type MovementListItem,
} from './useWarehouse';
import { useWarehouseView, MOVEMENT_SECTIONS } from './useWarehouseView';
import { WarehouseMovementCard } from './WarehouseMovementCard';
import { WarehouseBalanceTable } from './WarehouseBalanceTable';
import { CreateMovementDialog } from './CreateMovementDialog';

// ─── Колонки таблицы движений ─────────────────────────────────────────────────

const columns: ColumnDef<MovementListItem>[] = [
  {
    accessorKey: 'number',
    header: 'Номер',
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.number}</span>
    ),
  },
  {
    id: 'warehouse',
    header: 'Склад',
    cell: ({ row }) => {
      const name = row.original.fromWarehouse?.name ?? row.original.toWarehouse?.name ?? '—';
      return <span className="text-sm text-muted-foreground">{name}</span>;
    },
  },
  {
    accessorKey: 'movementDate',
    header: 'Дата',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.movementDate), 'd MMM yyyy', { locale: ru })}
      </span>
    ),
  },
  {
    id: 'lines',
    header: 'Кол-во позиций',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original._count.lines}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const s = row.original.status;
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            MOV_STATUS_CLASS[s]
          )}
        >
          {MOV_STATUS_LABELS[s]}
        </span>
      );
    },
  },
];

// ─── Компонент WarehouseView ──────────────────────────────────────────────────

interface Props {
  objectId: string;
}

export function WarehouseView({ objectId }: Props) {
  const vm = useWarehouseView(objectId);

  return (
    <div className="flex gap-6 min-h-[400px]">
      {/* Левая панель навигации */}
      <nav className="w-56 shrink-0">
        <ul className="space-y-1">
          {MOVEMENT_SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => vm.setActiveSection(s.id)}
                className={cn(
                  'w-full text-left text-sm px-3 py-2 rounded-md transition-colors',
                  vm.activeSection === s.id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
        <hr className="my-2" />
        <button
          type="button"
          onClick={() => vm.setActiveSection('balances')}
          className={cn(
            'w-full text-left text-sm px-3 py-2 rounded-md transition-colors',
            vm.activeSection === 'balances'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          Остатки
        </button>
      </nav>

      {/* Правая панель */}
      <div className="flex-1 min-w-0">
        {vm.activeSection === 'balances' ? (
          <WarehouseBalanceTable objectId={objectId} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => vm.setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Создать движение
              </Button>
            </div>

            {vm.isLoading ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                Загрузка...
              </div>
            ) : vm.movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground text-sm mb-4">
                  Движений пока нет. Создайте первое.
                </p>
                <Button size="sm" onClick={() => vm.setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Создать движение
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={vm.movements}
                searchPlaceholder="Поиск по номеру..."
                searchColumn="number"
                onRowClick={vm.handleRowClick}
              />
            )}
          </div>
        )}
      </div>

      {/* Карточка движения (открывается при клике по строке) */}
      {vm.selectedMovementId && (
        <WarehouseMovementCard
          objectId={objectId}
          movementId={vm.selectedMovementId}
          onClose={() => vm.setSelectedMovementId(null)}
          onMovementCreated={(id) => vm.setSelectedMovementId(id)}
        />
      )}

      <CreateMovementDialog
        open={vm.createOpen}
        onOpenChange={vm.setCreateOpen}
        activeSection={vm.activeSection}
        date={vm.newDate}
        onDateChange={vm.setNewDate}
        notes={vm.newNotes}
        onNotesChange={vm.setNewNotes}
        needsFrom={vm.needsFrom}
        needsTo={vm.needsTo}
        fromWarehouseId={vm.fromWarehouseId}
        onFromChange={vm.setFromWarehouseId}
        toWarehouseId={vm.toWarehouseId}
        onToChange={vm.setToWarehouseId}
        warehouses={vm.warehouses}
        onSubmit={vm.handleCreate}
        isPending={vm.createPending}
      />
    </div>
  );
}
