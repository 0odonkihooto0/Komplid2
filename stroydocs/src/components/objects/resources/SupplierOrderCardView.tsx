'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { SupplierOrderDocTab } from './SupplierOrderDocTab';
import { SupplierOrderItemsTab } from './SupplierOrderItemsTab';
import { SupplierOrderApprovalTab } from './SupplierOrderApprovalTab';
import { SupplierOrderSigningTab } from './SupplierOrderSigningTab';
import { SupplierOrderTimTab } from './SupplierOrderTimTab';
import { SupplierOrderRelatedTab } from './SupplierOrderRelatedTab';
import { SupplierOrderBottomBar } from './SupplierOrderBottomBar';
import {
  useOrderCard,
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

  const [tab, setTab] = useState('doc');

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

  return (
    <div className="flex flex-col min-h-0">
      {/* Шапка карточки */}
      <div className="flex flex-wrap items-center gap-3 pb-3">
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
          {order.items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {order.items.length} поз.
            </span>
          )}
        </div>
      </div>

      {/* Вкладки ЦУС (6 штук) */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1">
        <TabsList className="flex-wrap h-auto gap-0.5">
          <TabsTrigger value="doc">Документ</TabsTrigger>
          <TabsTrigger value="items">
            Товары
            {order.items.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">{order.items.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approval">Согласование</TabsTrigger>
          <TabsTrigger value="signing">Подписание</TabsTrigger>
          <TabsTrigger value="tim">Элементы ТИМ</TabsTrigger>
          <TabsTrigger value="related">
            Связанные документы
            {(order.movements.length > 0 || order.request) && (
              <span className="ml-1.5 text-xs opacity-70">
                {order.movements.length + (order.request ? 1 : 0)}
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

        <TabsContent value="approval">
          <SupplierOrderApprovalTab
            objectId={objectId}
            orderId={orderId}
            approvalRoute={order.approvalRoute}
            orderStatus={order.status}
          />
        </TabsContent>

        <TabsContent value="signing">
          <SupplierOrderSigningTab />
        </TabsContent>

        <TabsContent value="tim">
          <SupplierOrderTimTab />
        </TabsContent>

        <TabsContent value="related">
          <SupplierOrderRelatedTab objectId={objectId} order={order} />
        </TabsContent>
      </Tabs>

      {/* Нижняя панель кнопок (sticky) */}
      <SupplierOrderBottomBar objectId={objectId} orderId={orderId} order={order} />
    </div>
  );
}
