'use client';

import { useSession } from 'next-auth/react';
import { SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApprovalTimeline } from '@/components/modules/approval/ApprovalTimeline';
import type { ApprovalRoute } from '@/components/modules/approval/types';
import { useOrderWorkflow } from './useSupplierOrderActions';
import type { ApprovalRouteData } from './useSupplierOrderCard';

interface Props {
  objectId: string;
  orderId: string;
  approvalRoute: ApprovalRouteData | null;
  orderStatus: string;
}

// Финальные статусы, при которых согласование недоступно
const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

// Статусы, при которых можно запустить согласование
const ALLOWED_FOR_APPROVAL = ['SENT', 'CONFIRMED', 'DELIVERED'];

export function SupplierOrderApprovalTab({ objectId, orderId, approvalRoute, orderStatus }: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const { startWorkflow, queryKey } = useOrderWorkflow(objectId, orderId);

  const isTerminal = TERMINAL_STATUSES.includes(orderStatus);
  const canStart = ALLOWED_FOR_APPROVAL.includes(orderStatus) && !approvalRoute;
  const workflowBaseUrl = `/api/projects/${objectId}/supplier-orders/${orderId}/workflow`;

  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-md border p-4 space-y-4">
        <h3 className="text-sm font-medium">Маршрут согласования</h3>

        {/* Нет маршрута, финальный статус */}
        {isTerminal && !approvalRoute && (
          <p className="text-sm text-muted-foreground">
            Заказ находится в финальном статусе — согласование недоступно.
          </p>
        )}

        {/* Нет маршрута, статус не разрешает — только черновик */}
        {!isTerminal && !approvalRoute && !canStart && (
          <p className="text-sm text-muted-foreground">
            Для запуска согласования переведите заказ в статус «Отправлен», «Подтверждён» или «Доставлен».
          </p>
        )}

        {/* Можно запустить согласование */}
        {canStart && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Маршрут согласования не запущен. Нажмите кнопку для запуска.
            </p>
            <Button
              size="sm"
              onClick={() => startWorkflow.mutate()}
              disabled={startWorkflow.isPending}
            >
              <SendHorizonal className="mr-1.5 h-3.5 w-3.5" />
              {startWorkflow.isPending ? 'Запуск...' : 'Отправить на согласование'}
            </Button>
          </div>
        )}

        {/* Маршрут существует — показываем таймлайн */}
        {approvalRoute && (
          <ApprovalTimeline
            route={approvalRoute as unknown as ApprovalRoute}
            workflowBaseUrl={workflowBaseUrl}
            queryKey={queryKey}
            currentUserId={currentUserId}
            canStop={!isTerminal}
          />
        )}
      </div>
    </div>
  );
}
