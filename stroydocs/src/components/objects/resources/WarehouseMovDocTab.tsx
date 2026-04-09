'use client';

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { MovementDetail } from './useWarehouseMovement';
import { MOV_TYPE_LABELS } from './useWarehouseMovement';

interface Props {
  movement: MovementDetail;
}

// Вспомогательный компонент read-only поля
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value || '—'}</dd>
    </div>
  );
}

export function WarehouseMovDocTab({ movement }: Props) {
  // Форматирование даты движения
  const formattedDate = movement.movementDate
    ? format(new Date(movement.movementDate), 'd MMM yyyy', { locale: ru })
    : '—';

  // Наименование склада с адресом
  const fromWarehouseLabel = movement.fromWarehouse
    ? movement.fromWarehouse.location
      ? `${movement.fromWarehouse.name} — ${movement.fromWarehouse.location}`
      : movement.fromWarehouse.name
    : null;

  const toWarehouseLabel = movement.toWarehouse
    ? movement.toWarehouse.location
      ? `${movement.toWarehouse.name} — ${movement.toWarehouse.location}`
      : movement.toWarehouse.name
    : null;

  // ФИО создавшего документ
  const createdByLabel = movement.createdBy
    ? `${movement.createdBy.firstName} ${movement.createdBy.lastName}`
    : null;

  return (
    <div className="pt-2 max-w-lg">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Тип движения" value={MOV_TYPE_LABELS[movement.movementType]} />
        <Field label="Дата" value={formattedDate} />
        <Field label="Склад (откуда)" value={fromWarehouseLabel} />
        <Field label="Склад (куда)" value={toWarehouseLabel} />
        <Field label="Создал" value={createdByLabel} />
      </dl>

      {/* Примечание — в полную ширину */}
      {movement.notes && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Примечание</p>
          <p className="mt-0.5 text-sm text-foreground whitespace-pre-line">
            {movement.notes}
          </p>
        </div>
      )}
    </div>
  );
}
