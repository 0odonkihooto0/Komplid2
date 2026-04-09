'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { SupplierOrderCardData } from './useSupplierOrderCard';
import { useUpdateOrder } from './useSupplierOrderCard';

interface Props {
  objectId: string;
  order: SupplierOrderCardData;
}

export function SupplierOrderDocTab({ objectId, order }: Props) {
  const { toast } = useToast();
  const updateOrder = useUpdateOrder(objectId, order.id);

  // Локальные поля формы
  const [supplierOrgId, setSupplierOrgId] = useState(order.supplierOrgId ?? '');
  const [warehouseId, setWarehouseId] = useState(order.warehouseId ?? '');
  const [deliveryDate, setDeliveryDate] = useState(
    order.deliveryDate ? order.deliveryDate.slice(0, 10) : ''
  );
  const [notes, setNotes] = useState(order.notes ?? '');

  function handleSave() {
    updateOrder.mutate(
      {
        supplierOrgId: supplierOrgId.trim() || null,
        warehouseId: warehouseId.trim() || null,
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => toast({ title: 'Изменения сохранены' }),
      }
    );
  }

  return (
    <div className="space-y-4 pt-2 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="doc-supplier">Поставщик (ID организации)</Label>
        <Input
          id="doc-supplier"
          placeholder="UUID поставщика"
          value={supplierOrgId}
          onChange={(e) => setSupplierOrgId(e.target.value)}
        />
        {order.supplierOrg && (
          <p className="text-xs text-muted-foreground">{order.supplierOrg.name}</p>
        )}
      </div>

      {/* Заказчик — только отображение (API не поддерживает изменение) */}
      {order.customerOrg && (
        <div className="space-y-1">
          <Label>Заказчик</Label>
          <p className="text-sm text-foreground">{order.customerOrg.name}</p>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="doc-warehouse">Склад (ID)</Label>
        <Input
          id="doc-warehouse"
          placeholder="UUID склада"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="doc-date">Дата поставки</Label>
        <Input
          id="doc-date"
          type="date"
          className="w-40"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="doc-notes">Примечание</Label>
        <Textarea
          id="doc-notes"
          placeholder="Необязательно"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button size="sm" onClick={handleSave} disabled={updateOrder.isPending}>
        {updateOrder.isPending ? 'Сохранение...' : 'Сохранить'}
      </Button>

      {/* Мета-информация */}
      <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t">
        <p>
          Создан:{' '}
          {format(new Date(order.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
          {order.createdBy &&
            ` · ${order.createdBy.firstName} ${order.createdBy.lastName}`}
        </p>
      </div>
    </div>
  );
}
