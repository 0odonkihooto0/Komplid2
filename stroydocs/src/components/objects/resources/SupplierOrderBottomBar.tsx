'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ChevronDown, PackagePlus, Printer, Trash2, Copy } from 'lucide-react';
import { useChangeOrderStatus, useDeleteOrder, useCopyOrder } from './useSupplierOrderActions';
import { useCreateReceipt, useCreateFrom, useWarehouses, ORDER_STATUS_LABELS } from './useSupplierOrderCard';
import type { SupplierOrderCardData, SupplierOrderStatus } from './useSupplierOrderCard';

interface Props {
  objectId: string;
  orderId: string;
  order: SupplierOrderCardData;
}

// Все возможные переходы статусов (ЦУС)
const STATUS_TRANSITIONS: SupplierOrderStatus[] = [
  'DRAFT', 'SENT', 'CONFIRMED', 'DELIVERED', 'COMPLETED', 'CANCELLED',
];

// Типы складских документов «Создать на основании»
const CREATE_BASED_ON_ITEMS = [
  { label: 'Поступление', action: 'receipt' },
  { label: 'Отгрузка', action: 'shipment' },
  { label: 'Перемещение', action: 'transfer' },
  { label: 'Приходный ордер', action: 'receipt_order' },
  { label: 'Расходный ордер', action: 'expense_order' },
  { label: 'Списание', action: 'writeoff' },
] as const;

export function SupplierOrderBottomBar({ objectId, orderId, order }: Props) {
  const changeStatus = useChangeOrderStatus(objectId, orderId);
  const deleteOrder = useDeleteOrder(objectId, orderId);
  const copyOrder = useCopyOrder(objectId, orderId);
  const createReceipt = useCreateReceipt(objectId, orderId);
  const createFrom = useCreateFrom(objectId, orderId);
  const { warehouses } = useWarehouses(objectId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  function handleCreateReceipt() {
    if (!selectedWarehouseId) return;
    createReceipt.mutate(
      { warehouseId: selectedWarehouseId },
      { onSuccess: () => { setReceiptDialogOpen(false); setSelectedWarehouseId(''); } }
    );
  }

  // Маппинг action (lowercase) → WarehouseMovementType
  const ACTION_TO_TYPE: Record<string, string> = {
    shipment:      'SHIPMENT',
    transfer:      'TRANSFER',
    receipt_order: 'RECEIPT_ORDER',
    expense_order: 'EXPENSE_ORDER',
    writeoff:      'WRITEOFF',
  };

  function handleBasedOn(action: string) {
    if (action === 'receipt') {
      // Поступление требует выбора склада — открываем диалог
      setReceiptDialogOpen(true);
    } else {
      // Остальные типы: склад и контрагенты берутся из реквизитов заказа
      const targetType = ACTION_TO_TYPE[action];
      if (targetType) {
        createFrom.mutate({ targetType });
      }
    }
  }

  return (
    <>
      <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur-sm px-4 py-2.5 flex flex-wrap gap-2">
        {/* Сменить статус */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={changeStatus.isPending}>
              Сменить статус
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {STATUS_TRANSITIONS.filter((s) => s !== order.status).map((s) => (
              <DropdownMenuItem key={s} onClick={() => changeStatus.mutate(s)}>
                {ORDER_STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Заполнить из */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Заполнить из
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled>
              Из другого заказа (скоро)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Создать на основании */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={createFrom.isPending}>
              <PackagePlus className="mr-1 h-4 w-4" />
              {createFrom.isPending ? 'Создание...' : 'Создать на основании'}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {CREATE_BASED_ON_ITEMS.map((item) => (
              <DropdownMenuItem key={item.action} onClick={() => handleBasedOn(item.action)}>
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Печать */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Printer className="mr-1 h-4 w-4" />
              Печать
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled>
              Печатная форма заказа (скоро)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Действия */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Действия
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => copyOrder.mutate()} disabled={copyOrder.isPending}>
              <Copy className="mr-2 h-4 w-4" />
              Копировать
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заказ {order.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Удалить можно только заказ в статусе «Черновик». Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteOrder.mutate()}
              disabled={deleteOrder.isPending}
            >
              {deleteOrder.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог создания поступления на склад */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Создать поступление на склад</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="bb-warehouse-select">Выберите склад</Label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger id="bb-warehouse-select">
                  <SelectValue placeholder="Выберите склад..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.length === 0 ? (
                    <SelectItem value="_none" disabled>Нет доступных складов</SelectItem>
                  ) : (
                    warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                        {w.isDefault && ' (основной)'}
                        {w.location ? ` — ${w.location}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={handleCreateReceipt}
              disabled={!selectedWarehouseId || createReceipt.isPending}
            >
              {createReceipt.isPending ? 'Создание...' : 'Создать поступление'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
