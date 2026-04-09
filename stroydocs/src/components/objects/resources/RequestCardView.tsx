'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, SendHorizontal, ShoppingCart } from 'lucide-react';
import { RequestInfoTab } from './RequestInfoTab';
import { RequestItemsTab } from './RequestItemsTab';
import {
  useRequestCard,
  useUpdateRequest,
  useCreateOrder,
  STATUS_LABELS,
  STATUS_VARIANTS,
} from './useRequestCard';

interface Props {
  objectId: string;
  requestId: string;
}

export function RequestCardView({ objectId, requestId }: Props) {
  const router = useRouter();
  const { request, isLoading } = useRequestCard(objectId, requestId);
  const updateRequest = useUpdateRequest(objectId, requestId);
  const createOrder = useCreateOrder(objectId, requestId);

  const [tab, setTab] = useState('info');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Загрузка заявки...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Заявка не найдена
      </div>
    );
  }

  const canSubmit = request.status === 'DRAFT';
  const canCreateOrder = request.status === 'SUBMITTED' || request.status === 'APPROVED';

  return (
    <div className="space-y-4">
      {/* Шапка карточки */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/objects/${objectId}/resources/requests`)}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Заявки
        </Button>

        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-base font-semibold">ЛРВ {request.number}</h2>
          <Badge variant={STATUS_VARIANTS[request.status]}>
            {STATUS_LABELS[request.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {request._count.items} поз.
          </span>
        </div>

        {/* Кнопки действий — зависят от статуса */}
        <div className="flex gap-2">
          {canSubmit && (
            <Button
              size="sm"
              onClick={() => updateRequest.mutate({ status: 'SUBMITTED' })}
              disabled={updateRequest.isPending}
            >
              <SendHorizontal className="h-4 w-4 mr-1" />
              Подать заявку
            </Button>
          )}
          {canCreateOrder && (
            <Button
              size="sm"
              onClick={() => createOrder.mutate({})}
              disabled={createOrder.isPending}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              {createOrder.isPending ? 'Создание...' : 'Создать заказ поставщику'}
            </Button>
          )}
        </div>
      </div>

      {/* Вкладки */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="info">Информация</TabsTrigger>
          <TabsTrigger value="items">
            Позиции
            {request._count.items > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {request._count.items}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <RequestInfoTab objectId={objectId} request={request} />
        </TabsContent>

        <TabsContent value="items">
          <RequestItemsTab objectId={objectId} request={request} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
