import type { Payment, Receipt, Subscription } from '@prisma/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Chip } from '@/components/ui/chip';

type PaymentWithIncludes = Payment & {
  receipt: Receipt | null;
  subscription: (Subscription & { plan: { name: string } | null }) | null;
};

interface Props {
  payments: PaymentWithIncludes[];
}

/** Человекочитаемые названия типов платежей */
const TYPE_LABELS: Record<string, string> = {
  PLAN_PAYMENT: 'Оплата тарифа',
  PLAN_RENEWAL: 'Автопродление',
  PLAN_UPGRADE: 'Апгрейд',
  PLAN_PRORATION: 'Пересчёт',
  CREDIT_TOPUP: 'Пополнение',
  REFUND: 'Возврат',
  MANUAL: 'Ручной платёж',
};

/** Конфигурация отображения статусов платежей */
const STATUS_CONFIG: Record<string, { label: string; variant: 'ok' | 'err' | 'warn' | 'neutral' }> = {
  SUCCEEDED: { label: 'Успешно', variant: 'ok' },
  FAILED: { label: 'Ошибка', variant: 'err' },
  PENDING: { label: 'Ожидает', variant: 'warn' },
  WAITING_FOR_CAPTURE: { label: 'Подтверждение', variant: 'warn' },
  AUTHORIZED: { label: 'Авторизован', variant: 'warn' },
  REFUNDED: { label: 'Возврат', variant: 'neutral' },
  PARTIALLY_REFUNDED: { label: 'Частичный возврат', variant: 'neutral' },
  CANCELLED: { label: 'Отменён', variant: 'err' },
};

/** Форматирует сумму из копеек в рубли с локализацией */
function formatAmount(amountRub: number): string {
  return (amountRub / 100).toLocaleString('ru-RU') + ' ₽';
}

/** Форматирует дату платежа в кратком формате */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Определяет описание платежа по приоритету: явное описание → тариф → тип → fallback */
function getDescription(p: PaymentWithIncludes): string {
  return (
    p.description ??
    p.subscription?.plan?.name ??
    TYPE_LABELS[p.type ?? ''] ??
    'Платёж'
  );
}

export function PaymentsTable({ payments }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Дата</TableHead>
          <TableHead>Описание</TableHead>
          <TableHead className="text-right">Сумма</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>Чек</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-sm text-ink-soft">
              Платежей пока нет
            </TableCell>
          </TableRow>
        ) : (
          payments.map((p) => {
            const statusConfig = STATUS_CONFIG[p.status] ?? { label: p.status, variant: 'neutral' as const };
            return (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap text-sm text-ink-soft">
                  {formatDate(p.createdAt)}
                </TableCell>
                <TableCell className="text-sm text-ink-base">
                  {getDescription(p)}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-ink-base">
                  {formatAmount(p.amountRub)}
                </TableCell>
                <TableCell>
                  <Chip variant={statusConfig.variant}>{statusConfig.label}</Chip>
                </TableCell>
                <TableCell>
                  {p.receipt?.ofdUrl ? (
                    <a
                      href={p.receipt.ofdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--accent-bg)] underline-offset-2 hover:underline"
                    >
                      Чек ↗
                    </a>
                  ) : (
                    <span className="text-sm text-ink-muted">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
