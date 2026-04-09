'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { ArrowLeft, Send, PackagePlus } from 'lucide-react';
import { SupplierOrderDocTab } from './SupplierOrderDocTab';
import { SupplierOrderItemsTab } from './SupplierOrderItemsTab';
import {
  useOrderCard,
  useConduct,
  useCreateReceipt,
  useWarehouses,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
} from './useSupplierOrderCard';

interface Props {
  objectId: string;
  orderId: string;
}

export function SupplierOrderCardView({ objectId, orderId }: Props) {
  const router = useRouter();
  const { order, isLoading } = useOrderCard(objectId, orderId);
  const conduct = useConduct(objectId, orderId);
  const createReceipt = useCreateReceipt(objectId, orderId);
  const { warehouses } = useWarehouses(objectId);

  const [tab, setTab] = useState('doc');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Загрузка заказа...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Заказ не найден
      </div>
    );
  }

  const canConduct = order.status === 'DRAFT';
  const canCreateReceipt =
    order.status === 'SENT' ||
    order.status === 'CONFIRMED' ||
    order.status === 'DELIVERED';

  function handleCreateReceipt() {
    if (!selectedWarehouseId) return;
    createReceipt.mutate(
      { warehouseId: selectedWarehouseId },
      {
        onSuccess: () => {
          setReceiptDialogOpen(false);
          setSelectedWarehouseId('');
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      {/* Шапка карточки */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/objects/${objectId}/resources/procurement`)}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Закупки
        </Button>

        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-base font-semibold">Заказ {order.number}</h2>
          <Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {order.items.length} поз.
          </span>
        </div>

        {/* Кнопки действий — зависят от статуса */}
        <div className="flex gap-2">
          {canConduct && (
            <Button
              size="sm"
              onClick={() => conduct.mutate()}
              disabled={conduct.isPending}
            >
              <Send className="h-4 w-4 mr-1" />
              {conduct.isPending ? 'Отправка...' : 'Провести'}
            </Button>
          )}
          {canCreateReceipt && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReceiptDialogOpen(true)}
            >
              <PackagePlus className="h-4 w-4 mr-1" />
              Создать поступление
            </Button>
          )}
        </div>
      </div>

      {/* Вкладки */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="doc">Документ</TabsTrigger>
          <TabsTrigger value="items">
            Товары
            {order.items.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {order.items.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="doc">
          <SupplierOrderDocTab objectId={objectId} order={order} />
        </TabsContent>

        <TabsContent value="items">
          <SupplierOrderItemsTab objectId={objectId} order={order} />
        </TabsContent>
      </Tabs>

      {/* Диалог создания поступления на склад */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Создать поступление на склад</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="warehouse-select">Выберите склад</Label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger id="warehouse-select">
                  <SelectValue placeholder="Выберите склад..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.length === 0 ? (
                    <SelectItem value="" disabled>
                      Нет доступных складов
                    </SelectItem>
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
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateReceipt}
              disabled={!selectedWarehouseId || createReceipt.isPending}
            >
              {createReceipt.isPending ? 'Создание...' : 'Создать поступление'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
