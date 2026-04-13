'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, PackageSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_CLASS,
  type SupplierOrderListItem,
  type SupplierOrderStatus,
} from './useProcurement';
import { useProcurementView, SECTIONS } from './useProcurementView';
import { CreateOrderDialog } from './CreateOrderDialog';
import { FromRequestDialog } from './FromRequestDialog';

// ─── Колонки таблицы заказов ─────────────────────────────────────────────────

const columns: ColumnDef<SupplierOrderListItem>[] = [
  {
    accessorKey: 'number',
    header: 'Номер',
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.number}</span>
    ),
  },
  {
    id: 'supplier',
    header: 'Поставщик',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.supplierOrg?.name ?? '—'}
      </span>
    ),
  },
  {
    id: 'sum',
    header: 'Сумма, ₽',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.totalAmount != null
          ? row.original.totalAmount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
          : '—'}
      </span>
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
            ORDER_STATUS_CLASS[s]
          )}
        >
          {ORDER_STATUS_LABELS[s]}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Создан',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.createdAt), 'd MMM yyyy', { locale: ru })}
      </span>
    ),
  },
];

// ─── Компонент ProcurementView ────────────────────────────────────────────────

interface Props {
  objectId: string;
}

export function ProcurementView({ objectId }: Props) {
  const vm = useProcurementView(objectId);

  return (
    <div className="flex gap-6 min-h-[400px]">
      {/* Левая панель */}
      <nav className="w-56 shrink-0">
        <ul className="space-y-1">
          {SECTIONS.map((s) => {
            const count = vm.counts[s.type];
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => vm.setActiveSection(s.id)}
                  className={cn(
                    'w-full flex items-center justify-between text-sm px-3 py-2 rounded-md transition-colors',
                    vm.activeSection === s.id
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span>{s.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'ml-2 text-xs font-medium rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center',
                        vm.activeSection === s.id
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted-foreground/20 text-muted-foreground'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Правая панель — единый контент для всех трёх разделов */}
      <div className="flex-1 min-w-0">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => vm.setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {vm.addLabel}
            </Button>

            {/* Кнопка «Из заявки» только для раздела «Заказ поставщику» */}
            {vm.activeSection === 'orders' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => vm.setFromRequestOpen(true)}
              >
                <PackageSearch className="h-4 w-4 mr-1" />
                Из заявки
              </Button>
            )}

            <Select
              value={vm.statusFilter}
              onValueChange={(v) => vm.setStatusFilter(v as SupplierOrderStatus | '')}
            >
              <SelectTrigger className="w-44 h-9 ml-auto">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все статусы</SelectItem>
                {(Object.keys(ORDER_STATUS_LABELS) as SupplierOrderStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {vm.isLoading ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              Загрузка...
            </div>
          ) : vm.orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground text-sm mb-4">
                {vm.activeSection === 'orders' && 'Заказов пока нет. Создайте первый заказ поставщику.'}
                {vm.activeSection === 'warehouse-requests' && 'Заявок пока нет. Создайте первую заявку на склад.'}
                {vm.activeSection === 'inquiries' && 'Запросов пока нет. Создайте первый запрос поставщику.'}
              </p>
              <Button size="sm" onClick={() => vm.setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {vm.addLabel}
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={vm.orders}
              searchPlaceholder="Поиск по номеру..."
              searchColumn="number"
              onRowClick={vm.handleRowClick}
            />
          )}
        </div>
      </div>

      <CreateOrderDialog
        open={vm.createOpen}
        onOpenChange={vm.setCreateOpen}
        number={vm.newNumber}
        onNumberChange={vm.setNewNumber}
        notes={vm.newNotes}
        onNotesChange={vm.setNewNotes}
        onSubmit={vm.handleCreate}
        isPending={vm.createOrderPending}
      />

      <FromRequestDialog
        open={vm.fromRequestOpen}
        onOpenChange={vm.setFromRequestOpen}
        selectedRequestId={vm.selectedRequestId}
        onSelectRequest={vm.setSelectedRequestId}
        requestOptions={vm.requestOptions}
        onSubmit={vm.handleCreateFromRequest}
        isPending={vm.createFromRequestPending}
      />
    </div>
  );
}
