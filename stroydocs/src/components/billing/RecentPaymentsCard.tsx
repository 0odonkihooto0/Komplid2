import Link from 'next/link';
import { db } from '@/lib/db';
import type { PaymentType, PaymentStatus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import type { VariantProps } from 'class-variance-authority';
import { chipVariants } from '@/components/ui/chip';

interface Props {
  workspaceId: string;
  limit?: number;
}

/** Человекочитаемые названия типов платежей */
const TYPE_LABELS: Partial<Record<PaymentType, string>> = {
  PLAN_PAYMENT: 'Оплата тарифа',
  PLAN_RENEWAL: 'Автопродление',
  PLAN_UPGRADE: 'Апгрейд тарифа',
  PLAN_PRORATION: 'Пересчёт тарифа',
  CREDIT_TOPUP: 'Пополнение',
  REFUND: 'Возврат',
  MANUAL: 'Ручной платёж',
};

type ChipVariant = NonNullable<VariantProps<typeof chipVariants>['variant']>;

interface StatusConfig {
  label: string;
  variant: ChipVariant;
}

/** Конфигурация статусов платежей для Chip */
const STATUS_CONFIG: Partial<Record<PaymentStatus, StatusConfig>> = {
  SUCCEEDED: { label: 'Успешно', variant: 'ok' },
  FAILED: { label: 'Ошибка', variant: 'err' },
  PENDING: { label: 'Ожидает', variant: 'warn' },
  WAITING_FOR_CAPTURE: { label: 'Подтверждение', variant: 'warn' },
  REFUNDED: { label: 'Возврат', variant: 'neutral' },
  PARTIALLY_REFUNDED: { label: 'Частичный возврат', variant: 'neutral' },
  CANCELLED: { label: 'Отменён', variant: 'err' },
};

/** Форматирование суммы из копеек в рубли */
function formatRub(kopecks: number): string {
  return (kopecks / 100).toLocaleString('ru-RU') + ' ₽';
}

/** Форматирование даты на русском языке */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export async function RecentPaymentsCard({ workspaceId, limit = 3 }: Props) {
  const payments = await db.payment.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      subscription: {
        include: {
          plan: { select: { name: true } },
        },
      },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Последние платежи</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Платежей пока нет.</p>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => {
              /* Описание: явное → название плана → тип → fallback */
              const description =
                p.description ??
                p.subscription?.plan?.name ??
                (p.type != null ? (TYPE_LABELS[p.type] ?? 'Платёж') : 'Платёж');

              const statusConfig = STATUS_CONFIG[p.status] ?? {
                label: p.status,
                variant: 'neutral' as ChipVariant,
              };

              return (
                <li key={p.id} className="flex items-center gap-3 py-3 text-sm">
                  {/* Дата */}
                  <span className="w-28 shrink-0 text-muted-foreground tabular-nums">
                    {formatDate(p.createdAt)}
                  </span>

                  {/* Описание — занимает всё доступное пространство */}
                  <span className="min-w-0 flex-1 truncate">{description}</span>

                  {/* Сумма */}
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatRub(p.amountRub)}
                  </span>

                  {/* Статус */}
                  <Chip variant={statusConfig.variant} className="shrink-0">
                    {statusConfig.label}
                  </Chip>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter className="border-t pt-3">
        <Link
          href="/settings/billing/invoices"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Вся история →
        </Link>
      </CardFooter>
    </Card>
  );
}
