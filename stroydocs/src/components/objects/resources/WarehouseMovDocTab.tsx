'use client';

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { MovementDetail } from './useWarehouseMovement';
import { MOV_TYPE_LABELS } from './useWarehouseMovement';

interface Props {
  movement: MovementDetail;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value || '—'}</dd>
    </div>
  );
}

// Метки типа НДС
const VAT_TYPE_LABELS: Record<string, string> = {
  'ABOVE': 'НДС сверху',
  'INCLUDED': 'НДС в сумме',
};

// Метки валюты
const CURRENCY_LABELS: Record<string, string> = {
  'RUB': 'Рубли (₽)',
  'USD': 'Доллар (USD)',
  'EUR': 'Евро (EUR)',
};

export function WarehouseMovDocTab({ movement }: Props) {
  const formattedDate = movement.movementDate
    ? format(new Date(movement.movementDate), 'd MMM yyyy', { locale: ru })
    : '—';

  const formattedArrivalDate = movement.arrivalDate
    ? format(new Date(movement.arrivalDate), 'd MMM yyyy', { locale: ru })
    : null;

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

  const createdByLabel = movement.createdBy
    ? `${movement.createdBy.firstName} ${movement.createdBy.lastName}`
    : null;

  const vatTypeLabel = movement.vatType ? (VAT_TYPE_LABELS[movement.vatType] ?? movement.vatType) : null;
  const vatRateLabel = movement.vatRate != null ? `${movement.vatRate}%` : null;
  const currencyLabel = movement.currency ? (CURRENCY_LABELS[movement.currency] ?? movement.currency) : 'Рубли (₽)';

  return (
    <div className="pt-2 max-w-lg">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Тип движения" value={MOV_TYPE_LABELS[movement.movementType]} />
        <Field label="Дата" value={formattedDate} />
        <Field label="Дата прибытия" value={formattedArrivalDate} />
        <Field label="Объект строительства" value={movement.project?.name} />
        <Field label="Склад (откуда)" value={fromWarehouseLabel} />
        <Field label="Склад (куда)" value={toWarehouseLabel} />
        <Field label="Грузоотправитель" value={movement.consignor} />
        <Field label="Грузополучатель" value={movement.consignee} />
        <Field label="Тип НДС" value={vatTypeLabel} />
        <Field label="Ставка НДС" value={vatRateLabel} />
        <Field label="Валюта" value={currencyLabel} />
        <Field label="Создал" value={createdByLabel} />
      </dl>

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
