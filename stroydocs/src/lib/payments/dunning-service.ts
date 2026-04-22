import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { chargeRecurring } from './yookassa/payments';
import { buildSubscriptionReceipt } from './yookassa/receipts';
import { enqueueNotification, enqueueBillingEmail } from '@/lib/queue';
import type { Prisma, BillingPeriod } from '@prisma/client';

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildUserName(firstName: string | null, lastName: string | null, email: string): string {
  const name = [firstName, lastName].filter(Boolean).join(' ');
  return name || email.split('@')[0];
}

// Расписание: дни от окончания периода до каждой попытки списания
const DUNNING_SCHEDULE_DAYS = [0, 1, 3, 5, 7] as const;
const GRACE_PERIOD_DAYS = 7;

function makeDunningIdempotenceKey(subscriptionId: string, attemptNumber: number, periodEnd: Date): string {
  return `dunning-${subscriptionId}-attempt-${attemptNumber}-${periodEnd.toISOString().slice(0, 10)}`;
}

/**
 * Запускает dunning-цикл для подписки с истёкшим периодом.
 * Если нет сохранённой карты — сразу в GRACE.
 */
export async function startDunning(subscriptionId: string): Promise<void> {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      defaultPaymentMethod: true,
      workspace: { select: { ownerId: true } },
    },
  });
  if (!sub) return;

  const activeMethod = sub.defaultPaymentMethod?.isActive
    ? sub.defaultPaymentMethod
    : await db.paymentMethod.findFirst({
        where: { workspaceId: sub.workspaceId, isDefault: true, isActive: true },
      });

  if (!activeMethod) {
    logger.info({ subscriptionId }, 'Dunning: нет активной карты → grace');
    await transitionToGrace(subscriptionId);
    return;
  }

  await attemptDunningCharge(subscriptionId, 1);
}

/**
 * Выполняет попытку автосписания в рамках dunning-цикла.
 */
export async function attemptDunningCharge(subscriptionId: string, attemptNumber: number): Promise<void> {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: true,
      workspace: { select: { ownerId: true, id: true } },
      defaultPaymentMethod: true,
    },
  });
  if (!sub || sub.status !== 'PAST_DUE') return;

  const activeMethod =
    sub.defaultPaymentMethod?.isActive
      ? sub.defaultPaymentMethod
      : await db.paymentMethod.findFirst({
          where: { workspaceId: sub.workspaceId, isDefault: true, isActive: true },
        });

  if (!activeMethod) {
    await transitionToGrace(subscriptionId);
    return;
  }

  const idempotenceKey = makeDunningIdempotenceKey(subscriptionId, attemptNumber, sub.currentPeriodEnd);
  const amountRub = sub.billingPeriod === 'MONTHLY' ? sub.plan.priceMonthlyRub : sub.plan.priceYearlyRub;
  const description = `Автосписание: ${sub.plan.name} (попытка ${attemptNumber})`;

  const owner = await db.user.findUnique({
    where: { id: sub.workspace.ownerId },
    select: { email: true, phone: true },
  });

  const receipt = owner
    ? buildSubscriptionReceipt({
        email: owner.email,
        phone: owner.phone ?? undefined,
        plan: { name: sub.plan.name, priceRub: amountRub },
        billingPeriod: sub.billingPeriod as 'MONTHLY' | 'YEARLY',
      })
    : undefined;

  const dunningAttempt = await db.dunningAttempt.create({
    data: {
      subscriptionId,
      attemptNumber,
      scheduledAt: new Date(),
      executedAt: new Date(),
    },
  });

  const payment = await db.payment.create({
    data: {
      workspaceId: sub.workspaceId,
      userId: sub.workspace.ownerId,
      subscriptionId,
      source: 'APP',
      status: 'PENDING',
      type: 'PLAN_RENEWAL',
      billingPeriod: sub.billingPeriod as BillingPeriod,
      amountRub,
      originalAmountRub: amountRub,
      description,
      provider: 'YOOKASSA',
      providerIdempotenceKey: idempotenceKey,
      paymentMethodId: activeMethod.id,
      metadata: {
        paymentType: 'PLAN_RENEWAL',
        dunningAttempt: attemptNumber,
        subscriptionId,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  try {
    const ykPayment = await chargeRecurring({
      paymentMethodId: activeMethod.providerMethodId,
      amount: { value: (amountRub / 100).toFixed(2), currency: 'RUB' },
      description,
      receipt,
      metadata: {
        paymentDbId: payment.id,
        subscriptionId,
        paymentType: 'PLAN_RENEWAL',
      },
      idempotenceKey,
    });

    await db.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: ykPayment.id },
    });

    if (ykPayment.status === 'succeeded') {
      // Мгновенное подтверждение — применяем сразу
      await applySuccessfulDunningPayment(subscriptionId, payment.id, sub.billingPeriod as BillingPeriod);
      await db.dunningAttempt.update({
        where: { id: dunningAttempt.id },
        data: { result: 'SUCCESS', paymentId: payment.id },
      });
      logger.info({ subscriptionId, attemptNumber }, 'Dunning: платёж прошёл мгновенно');
    }
    // Если status === 'pending' — ждём webhook payment.succeeded/canceled

  } catch (err) {
    const failureReason = err instanceof Error ? err.message : String(err);
    logger.warn({ subscriptionId, attemptNumber, err }, 'Dunning: попытка не удалась');

    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failedAt: new Date(), failureReason },
    });
    await db.dunningAttempt.update({
      where: { id: dunningAttempt.id },
      data: { result: 'FAILED', failureReason, paymentId: payment.id },
    });

    await scheduleNextDunningAttempt(subscriptionId, attemptNumber);
  }
}

/**
 * Планирует следующую попытку или переводит в GRACE при исчерпании попыток.
 */
export async function scheduleNextDunningAttempt(subscriptionId: string, currentAttempt: number): Promise<void> {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: { select: { name: true } },
      workspace: { select: { ownerId: true } },
    },
  });
  if (!sub) return;

  const owner = await db.user.findUnique({
    where: { id: sub.workspace.ownerId },
    select: { email: true, firstName: true, lastName: true },
  });

  const nextAttemptIndex = currentAttempt; // attempt 1 → index 1 → 1 день
  if (nextAttemptIndex >= DUNNING_SCHEDULE_DAYS.length) {
    logger.info({ subscriptionId, currentAttempt }, 'Dunning: попытки исчерпаны → grace');

    // Финальная неудача — отправить email перед переходом в grace
    if (owner) {
      await enqueueBillingEmail({
        userId: sub.workspace.ownerId,
        email: owner.email,
        type: 'PAYMENT_FAILED_FINAL',
        subject: 'Последний шанс восстановить доступ',
        templateName: 'payment-failed-final',
        data: {
          userName: buildUserName(owner.firstName, owner.lastName, owner.email),
          planName: sub.plan.name,
          appUrl: process.env.APP_URL ?? 'https://app.stroydocs.ru',
          attemptNumber: currentAttempt,
        },
      });
    }

    await transitionToGrace(subscriptionId);
    return;
  }

  const delayDays = DUNNING_SCHEDULE_DAYS[nextAttemptIndex];
  const nextDunningAt = new Date(sub.currentPeriodEnd.getTime() + delayDays * 24 * 60 * 60 * 1000);

  await db.subscription.update({
    where: { id: subscriptionId },
    data: { dunningAttempts: currentAttempt, nextDunningAt },
  });

  // In-app уведомление
  await enqueueNotification({
    userId: sub.workspace.ownerId,
    email: owner?.email ?? '',
    type: 'subscription_payment_failed',
    title: 'Не удалось списать оплату',
    body: `Попытка ${currentAttempt} из 5 не удалась. Следующая попытка — ${nextDunningAt.toLocaleDateString('ru-RU')}. Проверьте данные карты.`,
  });

  // Email по шаблону
  if (owner) {
    const appUrl = process.env.APP_URL ?? 'https://app.stroydocs.ru';
    const userName = buildUserName(owner.firstName, owner.lastName, owner.email);
    const emailType = currentAttempt === 1 ? 'PAYMENT_FAILED_1'
      : currentAttempt === 3 ? 'PAYMENT_FAILED_3'
      : null;
    if (emailType) {
      await enqueueBillingEmail({
        userId: sub.workspace.ownerId,
        email: owner.email,
        type: emailType,
        subject: currentAttempt === 1 ? 'Не удалось списать оплату' : 'Проблема с оплатой — обновите карту',
        templateName: currentAttempt === 1 ? 'payment-failed-1' : 'payment-failed-3',
        data: {
          userName,
          planName: sub.plan.name,
          appUrl,
          attemptNumber: currentAttempt,
          nextAttemptDate: formatDate(nextDunningAt),
        },
      });
    }
  }
}

/**
 * Переводит подписку в Grace-период (7 дней readonly).
 */
export async function transitionToGrace(subscriptionId: string): Promise<void> {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: { select: { name: true } },
      workspace: { select: { ownerId: true } },
    },
  });
  if (!sub) return;

  const graceUntil = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await db.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'GRACE', graceUntil, nextDunningAt: null },
    });
    await tx.subscriptionEvent.create({
      data: {
        subscriptionId,
        type: 'GRACE_STARTED',
        actorType: 'SYSTEM',
        payload: { graceUntil: graceUntil.toISOString() } as unknown as Prisma.InputJsonValue,
      },
    });
  });

  const owner = await db.user.findUnique({
    where: { id: sub.workspace.ownerId },
    select: { email: true, firstName: true, lastName: true },
  });

  const graceUntilStr = formatDate(graceUntil);
  const appUrl = process.env.APP_URL ?? 'https://app.stroydocs.ru';

  await enqueueNotification({
    userId: sub.workspace.ownerId,
    email: owner?.email ?? '',
    type: 'subscription_grace_started',
    title: 'Подписка — льготный период',
    body: `Доступ сохранён до ${graceUntilStr}. После этой даты функции будут ограничены.`,
  });

  if (owner) {
    await enqueueBillingEmail({
      userId: sub.workspace.ownerId,
      email: owner.email,
      type: 'GRACE_STARTED',
      subject: 'Льготный период — доступ временно сохранён',
      templateName: 'grace-started',
      data: {
        userName: buildUserName(owner.firstName, owner.lastName, owner.email),
        planName: sub.plan.name,
        appUrl,
        graceUntil: graceUntilStr,
      },
    });
  }

  logger.info({ subscriptionId, graceUntil }, 'Dunning: переход в GRACE');
}

/**
 * Переводит подписку в EXPIRED и снимает привязку к workspace.
 */
export async function transitionToExpired(subscriptionId: string): Promise<void> {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: { select: { name: true } },
      workspace: { select: { ownerId: true, activeSubscriptionId: true, id: true } },
    },
  });
  if (!sub) return;

  await db.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'EXPIRED' },
    });
    if (sub.workspace.activeSubscriptionId === subscriptionId) {
      await tx.workspace.update({
        where: { id: sub.workspaceId },
        data: { activeSubscriptionId: null },
      });
    }
    await tx.subscriptionEvent.create({
      data: {
        subscriptionId,
        type: 'EXPIRED',
        actorType: 'SYSTEM',
        payload: {} as unknown as Prisma.InputJsonValue,
      },
    });
  });

  const owner = await db.user.findUnique({
    where: { id: sub.workspace.ownerId },
    select: { email: true, firstName: true, lastName: true },
  });

  await enqueueNotification({
    userId: sub.workspace.ownerId,
    email: owner?.email ?? '',
    type: 'subscription_expired',
    title: 'Подписка отключена',
    body: 'Льготный период истёк. Доступ к Pro-функциям приостановлен. Оформите новую подписку для восстановления.',
  });

  if (owner) {
    await enqueueBillingEmail({
      userId: sub.workspace.ownerId,
      email: owner.email,
      type: 'SUBSCRIPTION_EXPIRED',
      subject: 'Подписка отключена',
      templateName: 'subscription-expired',
      data: {
        userName: buildUserName(owner.firstName, owner.lastName, owner.email),
        planName: sub.plan.name,
        appUrl: process.env.APP_URL ?? 'https://app.stroydocs.ru',
      },
    });
  }

  logger.info({ subscriptionId }, 'Dunning: переход в EXPIRED');
}

/**
 * Применяет успешный dunning-платёж: сбрасывает dunning-поля, продлевает подписку.
 */
export async function applySuccessfulDunningPayment(
  subscriptionId: string,
  paymentId: string,
  billingPeriod: BillingPeriod,
): Promise<void> {
  function addPeriod(date: Date, period: BillingPeriod): Date {
    const d = new Date(date);
    if (period === 'MONTHLY') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    return d;
  }

  const now = new Date();
  const newPeriodEnd = addPeriod(now, billingPeriod);

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'SUCCEEDED', paidAt: now, capturedAt: now },
    });
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: newPeriodEnd,
        dunningAttempts: 0,
        nextDunningAt: null,
        graceUntil: null,
      },
    });
    await tx.subscriptionEvent.create({
      data: {
        subscriptionId,
        type: 'DUNNING_RESOLVED',
        actorType: 'WEBHOOK',
        payload: { paymentId } as unknown as Prisma.InputJsonValue,
      },
    });
  });

  logger.info({ subscriptionId, paymentId }, 'Dunning: платёж успешен, подписка восстановлена');
}
