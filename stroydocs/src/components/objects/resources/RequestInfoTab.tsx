'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { RequestCardData } from './useRequestCard';
import { useUpdateRequest } from './useRequestCard';

interface Props {
  objectId: string;
  request: RequestCardData;
}

export function RequestInfoTab({ objectId, request }: Props) {
  const { toast } = useToast();
  const updateRequest = useUpdateRequest(objectId, request.id);

  // Локальный стейт формы
  const [deliveryDate, setDeliveryDate] = useState(
    request.deliveryDate ? request.deliveryDate.slice(0, 10) : ''
  );
  const [notes, setNotes] = useState(request.notes ?? '');
  const [supplierOrgId, setSupplierOrgId] = useState(request.supplierOrgId ?? '');
  const [managerId, setManagerId] = useState(request.managerId ?? '');
  const [responsibleId, setResponsibleId] = useState(request.responsibleId ?? '');

  function handleSave() {
    updateRequest.mutate(
      {
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
        notes: notes.trim() || null,
        supplierOrgId: supplierOrgId.trim() || null,
        managerId: managerId.trim() || null,
        responsibleId: responsibleId.trim() || null,
      },
      {
        onSuccess: () => toast({ title: 'Изменения сохранены' }),
      }
    );
  }

  return (
    <div className="max-w-lg space-y-5 pt-2">
      {/* Реквизиты */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="delivery-date">Срок поставки</Label>
          <Input
            id="delivery-date"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="supplier">Поставщик (ID организации)</Label>
          <Input
            id="supplier"
            placeholder="UUID организации-поставщика"
            value={supplierOrgId}
            onChange={(e) => setSupplierOrgId(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="manager">Менеджер МТС (ID пользователя)</Label>
          <Input
            id="manager"
            placeholder="UUID менеджера МТС"
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="responsible">Ответственный на объекте (ID пользователя)</Label>
          <Input
            id="responsible"
            placeholder="UUID ответственного"
            value={responsibleId}
            onChange={(e) => setResponsibleId(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes">Примечания</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Дополнительные сведения по заявке..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={updateRequest.isPending}>
        {updateRequest.isPending ? 'Сохранение...' : 'Сохранить'}
      </Button>

      {/* История создания */}
      <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
        <div>
          Создана:{' '}
          {format(new Date(request.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
        </div>
        <div>
          Обновлена:{' '}
          {format(new Date(request.updatedAt), 'd MMM yyyy, HH:mm', { locale: ru })}
        </div>
        <div>Заказов по заявке: {request._count.orders}</div>
      </div>
    </div>
  );
}
