'use client';

import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { SupplierOrderCardData, WarehouseMovementRef } from './useSupplierOrderCard';

interface Props {
  objectId: string;
  order: SupplierOrderCardData;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  RECEIPT: 'Поступление',
  SHIPMENT: 'Отгрузка',
  TRANSFER: 'Перемещение',
  WRITEOFF: 'Списание',
  RETURN: 'Возврат',
  RECEIPT_ORDER: 'Приходный ордер',
  EXPENSE_ORDER: 'Расходный ордер',
};

const MOVEMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  CONDUCTED: 'Проведён',
  CANCELLED: 'Отменён',
};

const MOVEMENT_STATUS_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive'> = {
  DRAFT: 'secondary',
  CONDUCTED: 'default',
  CANCELLED: 'destructive',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Отправлена',
  APPROVED: 'Одобрена',
  IN_PROGRESS: 'В работе',
  DELIVERED: 'Доставлена',
  CANCELLED: 'Отменена',
};

function MovementRow({ mov, objectId }: { mov: WarehouseMovementRef; objectId: string }) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30">
      <td className="px-3 py-2 text-sm font-medium">{mov.number}</td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {MOVEMENT_TYPE_LABELS[mov.movementType] ?? mov.movementType}
      </td>
      <td className="px-3 py-2">
        <Badge variant={MOVEMENT_STATUS_VARIANTS[mov.status] ?? 'secondary'}>
          {MOVEMENT_STATUS_LABELS[mov.status] ?? mov.status}
        </Badge>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {mov.movementDate
          ? format(new Date(mov.movementDate), 'd MMM yyyy', { locale: ru })
          : '—'}
      </td>
      <td className="px-3 py-2">
        <Link
          href={`/objects/${objectId}/resources/warehouse?movementId=${mov.id}`}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          Открыть
          <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  );
}

export function SupplierOrderRelatedTab({ objectId, order }: Props) {
  return (
    <div className="space-y-6 pt-3">
      {/* Заявка-основание */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Заявка-основание</h3>
        {order.request ? (
          <div className="rounded-md border p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Заявка {order.request.number}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Статус: {REQUEST_STATUS_LABELS[order.request.status] ?? order.request.status}
              </p>
            </div>
            <Link
              href={`/objects/${objectId}/resources/requests/${order.request.id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Открыть заявку
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Заказ создан без заявки-основания.</p>
        )}
      </section>

      {/* Поступления на склад */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">
          Связанные документы склада
          {order.movements.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {order.movements.length} шт.
            </span>
          )}
        </h3>
        {order.movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Поступлений пока нет. Используйте кнопку «Создать на основании» для создания складского документа.
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Номер</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Тип</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Статус</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Дата</th>
                  <th className="px-3 py-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {order.movements.map((mov) => (
                  <MovementRow key={mov.id} mov={mov} objectId={objectId} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
