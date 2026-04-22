'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Subscription, SubscriptionPlan, PaymentMethod } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';

interface Props {
  subscription: Subscription & {
    plan: SubscriptionPlan;
    defaultPaymentMethod: PaymentMethod | null;
  };
}

/** Количество дней до указанной даты (минимум 0) */
function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

/** Форматирование даты на русском языке */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Форматирование суммы в рублях из копеек */
function formatRub(kopecks: number): string {
  return (kopecks / 100).toLocaleString('ru-RU');
}

// --- Подкомпоненты состояний ---

function TrialingState({ subscription }: Props) {
  const days = daysUntil(new Date(subscription.currentPeriodEnd));
  const hasCard = subscription.defaultPaymentMethod !== null;

  return (
    <>
      <div className="flex items-center gap-2">
        <Chip variant="ok">Пробный период</Chip>
        <span className="text-sm text-muted-foreground">Осталось {days} дн.</span>
      </div>
      {!hasCard && (
        <div className="mt-3 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          Добавьте карту для автопродления подписки
        </div>
      )}
      <div className="mt-4">
        <Button asChild size="sm" variant={hasCard ? 'outline' : 'default'}>
          <Link href="/settings/billing/payment-methods">Добавить карту</Link>
        </Button>
      </div>
    </>
  );
}

function ActiveState({ subscription }: Props) {
  const { plan, billingPeriod, currentPeriodEnd } = subscription;
  /* Цена зависит от периода тарификации */
  const priceKopecks =
    billingPeriod === 'YEARLY' ? plan.priceYearlyRub : plan.priceMonthlyRub;

  return (
    <>
      <div className="flex items-center gap-2">
        <Chip variant="ok">Активна</Chip>
        <span className="font-medium">{plan.name}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Следующий платёж: {formatDate(new Date(currentPeriodEnd))} &middot;{' '}
        {formatRub(priceKopecks)} ₽
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Button asChild size="sm">
          <Link href="/settings/billing/change-plan">Сменить тариф</Link>
        </Button>
        <Link
          href="/settings/billing/cancel"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Отменить
        </Link>
      </div>
    </>
  );
}

function CancelAtPeriodEndState({ subscription }: Props) {
  /* cancelAtPeriodEnd === true при статусе ACTIVE — показываем дату отмены */
  const endDate = subscription.effectiveEndDate ?? subscription.currentPeriodEnd;
  return (
    <>
      <div className="flex items-center gap-2">
        <Chip variant="warn">Отменяется</Chip>
        <span className="font-medium">{subscription.plan.name}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Подписка активна до {formatDate(new Date(endDate))}
      </p>
      <div className="mt-4">
        <Button asChild size="sm" variant="outline">
          <Link href="/settings/billing/change-plan">Сменить тариф</Link>
        </Button>
      </div>
    </>
  );
}

function PastDueState({ subscription }: Props) {
  const { dunningAttempts, defaultPaymentMethod } = subscription;

  return (
    <>
      <div className="mb-3 rounded-md border border-err/30 bg-err/10 px-3 py-2">
        <p className="text-sm font-medium text-err">
          Автосписание не прошло. Попытка {dunningAttempts} из 5.
        </p>
        {defaultPaymentMethod?.cardLast4 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Карта •{defaultPaymentMethod.cardLast4} отклонена банком
          </p>
        )}
      </div>
      <Button asChild size="sm">
        <Link href="/settings/billing/payment-methods">Обновить карту</Link>
      </Button>
    </>
  );
}

function GraceState({ subscription }: Props) {
  const { graceUntil } = subscription;

  return (
    <>
      <div className="mb-3 rounded-md border border-warn/30 bg-warn/10 px-3 py-2">
        <p className="text-sm font-medium text-warn">
          Подписка закончилась. Режим только для чтения.
        </p>
        {graceUntil && (
          <p className="mt-1 text-sm text-muted-foreground">
            Доступ закрывается {formatDate(new Date(graceUntil))}
          </p>
        )}
      </div>
      <Button asChild size="sm">
        <Link href="/settings/subscription">Выбрать тариф</Link>
      </Button>
    </>
  );
}

function CancelledState({ subscription }: { subscription: Subscription }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const endDate = subscription.effectiveEndDate ?? subscription.currentPeriodEnd;

  async function handleReactivate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscription.id}/reactivate`, {
        method: 'POST',
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-3 rounded-md border border-warn/30 bg-warn/10 px-3 py-2">
        <p className="text-sm font-medium text-warn">
          Подписка отменена. Активна до {formatDate(new Date(endDate))}.
        </p>
      </div>
      <Button size="sm" onClick={handleReactivate} disabled={loading}>
        {loading ? 'Возобновление…' : 'Возобновить'}
      </Button>
    </>
  );
}

function ExpiredState() {
  return (
    <>
      <p className="text-sm text-muted-foreground">Подписка истекла.</p>
      <div className="mt-4">
        <Button asChild size="sm">
          <Link href="/settings/subscription">Выбрать тариф</Link>
        </Button>
      </div>
    </>
  );
}

// --- Основной компонент ---

export function CurrentSubscriptionCard({ subscription }: Props) {
  const { status, cancelAtPeriodEnd } = subscription;

  function renderContent() {
    /* Если активна, но отменяется в конце периода — особое состояние */
    if (status === 'ACTIVE' && cancelAtPeriodEnd) {
      return <CancelAtPeriodEndState subscription={subscription} />;
    }

    switch (status) {
      case 'TRIALING':
        return <TrialingState subscription={subscription} />;
      case 'ACTIVE':
        return <ActiveState subscription={subscription} />;
      case 'PAST_DUE':
        return <PastDueState subscription={subscription} />;
      case 'GRACE':
        return <GraceState subscription={subscription} />;
      case 'CANCELLED':
      case 'CANCELED':
        return <CancelledState subscription={subscription} />;
      case 'EXPIRED':
        return <ExpiredState />;
      default:
        return <ExpiredState />;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Текущая подписка</CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
