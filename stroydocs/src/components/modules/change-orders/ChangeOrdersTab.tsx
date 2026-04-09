'use client';

import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { CreateChangeOrderDialog } from './CreateChangeOrderDialog';
import {
  useChangeOrders, useCreateChangeOrder, useUpdateChangeOrderStatus,
  type ChangeOrderStatus,
} from './useChangeOrders';
import { formatDate, formatCurrency } from '@/utils/format';

const STATUS_LABELS: Record<ChangeOrderStatus, string> = {
  DRAFT: 'Черновик',
  SENT: 'Отправлено',
  APPROVED: 'Утверждено',
  REJECTED: 'Отклонено',
};

const STATUS_VARIANTS: Record<ChangeOrderStatus, 'secondary' | 'outline' | 'default' | 'destructive'> = {
  DRAFT: 'secondary',
  SENT: 'outline',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

interface Props {
  projectId: string;
  contractId: string;
}

export function ChangeOrdersTab({ projectId, contractId }: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: orders, isLoading } = useChangeOrders(projectId, contractId);
  const createOrder = useCreateChangeOrder(projectId, contractId);
  const updateStatus = useUpdateChangeOrderStatus(projectId, contractId);

  function handleCreate(data: { number: string; title: string; description?: string; amount: number }) {
    createOrder.mutate(data, { onSuccess: () => setCreateOpen(false) });
  }

  const totalChange = orders?.reduce((sum, o) => sum + (o.status === 'APPROVED' ? o.amount : 0), 0) ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">Дополнительные работы и изменения объёма</p>
          {orders && orders.length > 0 && (
            <p className="flex items-center gap-1.5 text-sm font-medium">
              {totalChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              Итоговое изменение стоимости (утверждённые):{' '}
              <span className={totalChange >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange)}
              </span>
            </p>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Новое ДС
        </Button>
      </div>

      {(!orders || orders.length === 0) ? (
        <EmptyState
          icon={<TrendingUp className="h-10 w-10" />}
          title="Нет доп. соглашений"
          description="Оформляйте изменения объёма работ через доп. соглашения с подтверждением заказчика"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Создать ДС
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center gap-4 rounded-lg border p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{order.number}</span>
                  <span className="text-sm text-muted-foreground">—</span>
                  <span className="text-sm truncate">{order.title}</span>
                </div>
                {order.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{order.description}</p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {order.createdBy.lastName} {order.createdBy.firstName} · {formatDate(order.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-sm font-semibold ${order.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {order.amount >= 0 ? '+' : ''}{formatCurrency(order.amount)}
                </span>
                <Badge variant={STATUS_VARIANTS[order.status]}>
                  {STATUS_LABELS[order.status]}
                </Badge>
                {order.status === 'DRAFT' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus.mutate({ orderId: order.id, status: 'SENT' })}
                    disabled={updateStatus.isPending}
                  >
                    Отправить
                  </Button>
                )}
                {order.status === 'SENT' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => updateStatus.mutate({ orderId: order.id, status: 'APPROVED' })}
                    disabled={updateStatus.isPending}
                  >
                    Утвердить
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateChangeOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isPending={createOrder.isPending}
      />
    </div>
  );
}
