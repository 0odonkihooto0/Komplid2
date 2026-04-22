'use client';

import { CreditCard } from 'lucide-react';
import type { PaymentMethod } from '@prisma/client';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';

interface Props {
  method: PaymentMethod;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  isDeleting: boolean;
  isSettingDefault: boolean;
}

/** Человекочитаемое название метода оплаты по типу */
function getMethodLabel(method: PaymentMethod): string {
  if (method.type === 'BANK_CARD') {
    const brand = method.cardBrand ?? 'Карта';
    const last4 = method.cardLast4 ?? '????';
    const month = method.cardExpiryMonth ?? '??';
    const year = method.cardExpiryYear ?? '??';
    return `${brand} •••• ${last4} (${month}/${year})`;
  }
  if (method.type === 'SBP') return 'СБП';
  if (method.type === 'YOOMONEY') return 'ЮMoney';
  return method.accountTitle ?? method.type;
}

/** Проверяет истечение срока карты. Возвращает true если карта просрочена. */
function isCardExpired(method: PaymentMethod): boolean {
  // Проверяем только если оба поля заполнены
  if (method.cardExpiryYear == null || method.cardExpiryMonth == null) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return (
    method.cardExpiryYear < currentYear ||
    (method.cardExpiryYear === currentYear && method.cardExpiryMonth < currentMonth)
  );
}

export function PaymentMethodCard({ method, onDelete, onSetDefault, isDeleting, isSettingDefault }: Props) {
  const expired = isCardExpired(method);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-token bg-bg-surface p-4">
      {/* Иконка метода оплаты */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-inset">
        <CreditCard className="h-5 w-5 text-ink-soft" aria-label="Метод оплаты" />
      </div>

      {/* Название и статусные чипы */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium text-ink-base">
          {getMethodLabel(method)}
        </span>
        <div className="flex items-center gap-1.5">
          {method.isDefault && (
            <Chip variant="ok" dot={false}>По умолчанию</Chip>
          )}
          {expired && (
            <Chip variant="warn">Истекла</Chip>
          )}
        </div>
      </div>

      {/* Кнопки управления */}
      <div className="flex shrink-0 items-center gap-2">
        {!method.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetDefault(method.id)}
            disabled={isSettingDefault}
          >
            Сделать основной
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(method.id)}
          disabled={isDeleting}
          className="text-[var(--err)] hover:text-[var(--err)]"
        >
          Удалить
        </Button>
      </div>
    </div>
  );
}
