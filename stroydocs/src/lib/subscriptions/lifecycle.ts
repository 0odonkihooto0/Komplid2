import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { startDunning, attemptDunningCharge, transitionToExpired } from '@/lib/payments/dunning-service';
import { enqueueBillingEmail } from '@/lib/queue';
import type { Prisma } from '@prisma/client';

function buildUserName(firstName: string | null, lastName: string | null, email: string): string {
  const name = [firstName, lastName].filter(Boolean).join(' ');
  return name || email.split('@')[0];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Переводит истёкшие триалы в EXPIRED и снимает активную подписку с воркспейса
export async function processExpiredTrials(): Promise<number> {
  const now = new Date();
  const expired = await db.subscription.findMany({
    where: { status: 'TRIAL', trialEnd: { lt: now } },
    select: {
      id: true,
      workspaceId: true,
      plan: { select: { name: true } },
      workspace: { select: { ownerId: true, activeSubscriptionId: true } },
    },
  });

  if (expired.length === 0) return 0;

  const appUrl = process.env.APP_URL ?? 'https://app.stroydocs.ru';

  await db.$transaction(async (tx) => {
    for (const sub of expired) {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      if (sub.workspace.activeSubscriptionId === sub.id) {
        await tx.workspace.update({
          where: { id: sub.workspaceId },
          data: { activeSubscriptionId: null },
        });
      }
      await tx.notification.create({
        data: {
          type: 'subscription_expired',
          title: 'Пробный период завершён',
          body: 'Ваш 14-дневный пробный период закончился. Оформите подписку чтобы сохранить доступ к Pro-функциям.',
          userId: sub.workspace.ownerId,
        },
      });
    }
  });

  // Email отправляем вне транзакции
  for (const sub of expired) {
    const owner = await db.user.findUnique({
      where: { id: sub.workspace.ownerId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (owner) {
      await enqueueBillingEmail({
        userId: sub.workspace.ownerId,
        email: owner.email,
        type: 'TRIAL_EXPIRED',
        subject: 'Пробный период завершён',
        templateName: 'trial-expired',
        data: {
          userName: buildUserName(owner.firstName, owner.lastName, owner.email),
          planName: sub.plan.name,
          appUrl,
        },
      });
    }
  }

  logger.info({ count: expired.length }, 'processExpiredTrials: завершено');
  return expired.length;
}

// Переводит активные подписки с истёкшим периодом в PAST_DUE и запускает dunning
export async function processExpiredSubscriptions(): Promise<number> {
  const now = new Date();
  const expired = await db.subscription.findMany({
    where: { status: 'ACTIVE', currentPeriodEnd: { lt: now } },
    select: {
      id: true,
      workspaceId: true,
      workspace: { select: { ownerId: true } },
    },
  });

  if (expired.length === 0) return 0;

  for (const sub of expired) {
    await db.subscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE' },
    });
    await db.notification.create({
      data: {
        type: 'subscription_past_due',
        title: 'Требуется оплата подписки',
        body: 'Срок вашей подписки истёк. Производим попытку автосписания.',
        userId: sub.workspace.ownerId,
      },
    });
    // Запускаем dunning-цикл (асинхронно, не блокируем основной цикл)
    startDunning(sub.id).catch((err) =>
      logger.error({ err, subscriptionId: sub.id }, 'processExpiredSubscriptions: ошибка startDunning'),
    );
  }

  logger.info({ count: expired.length }, 'processExpiredSubscriptions: завершено');
  return expired.length;
}

// Переводит PAST_DUE/GRACE с истёкшим grace-периодом в EXPIRED
export async function processExpiredGracePeriods(): Promise<number> {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Старый fallback: PAST_DUE без dunning старше 7 дней → EXPIRED
  const pastDueFallback = await db.subscription.findMany({
    where: { status: 'PAST_DUE', currentPeriodEnd: { lt: graceCutoff }, nextDunningAt: null },
    select: { id: true },
  });

  // Новый путь: GRACE с истёкшим graceUntil → EXPIRED
  const graceExpired = await db.subscription.findMany({
    where: { status: 'GRACE', graceUntil: { lt: now } },
    select: { id: true },
  });

  const allToExpire = [...pastDueFallback, ...graceExpired];
  if (allToExpire.length === 0) return 0;

  for (const sub of allToExpire) {
    await transitionToExpired(sub.id);
  }

  logger.info({ count: allToExpire.length }, 'processExpiredGracePeriods: завершено');
  return allToExpire.length;
}

// Переводит отменённые подписки с истёкшим периодом в EXPIRED
export async function processCanceledExpired(): Promise<number> {
  const now = new Date();
  const expired = await db.subscription.findMany({
    where: { status: 'CANCELED', currentPeriodEnd: { lt: now } },
    select: {
      id: true,
      workspaceId: true,
      workspace: { select: { ownerId: true, activeSubscriptionId: true } },
    },
  });

  if (expired.length === 0) return 0;

  await db.$transaction(async (tx) => {
    for (const sub of expired) {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      if (sub.workspace.activeSubscriptionId === sub.id) {
        await tx.workspace.update({
          where: { id: sub.workspaceId },
          data: { activeSubscriptionId: null },
        });
      }
      await tx.notification.create({
        data: {
          type: 'subscription_canceled_expired',
          title: 'Подписка завершена',
          body: 'Ваша подписка была отменена и её срок истёк. Вы можете оформить новую подписку в любое время.',
          userId: sub.workspace.ownerId,
        },
      });
    }
  });

  logger.info({ count: expired.length }, 'processCanceledExpired: завершено');
  return expired.length;
}

// Выполняет запланированные dunning-попытки (nextDunningAt < now)
export async function processDunningAttempts(): Promise<number> {
  const now = new Date();

  // Подписки с запланированными попытками
  const scheduled = await db.subscription.findMany({
    where: {
      status: 'PAST_DUE',
      nextDunningAt: { lte: now },
    },
    select: { id: true, dunningAttempts: true },
  });

  for (const sub of scheduled) {
    await attemptDunningCharge(sub.id, sub.dunningAttempts + 1).catch((err) =>
      logger.error({ err, subscriptionId: sub.id }, 'processDunningAttempts: ошибка попытки'),
    );
  }

  // Подписки, у которых dunning ещё не начался (новые PAST_DUE без карты или первичный запуск)
  const newPastDue = await db.subscription.findMany({
    where: {
      status: 'PAST_DUE',
      dunningAttempts: 0,
      nextDunningAt: null,
    },
    select: { id: true },
  });

  for (const sub of newPastDue) {
    await startDunning(sub.id).catch((err) =>
      logger.error({ err, subscriptionId: sub.id }, 'processDunningAttempts: ошибка startDunning'),
    );
  }

  const total = scheduled.length + newPastDue.length;
  if (total > 0) logger.info({ scheduled: scheduled.length, newPastDue: newPastDue.length }, 'processDunningAttempts: завершено');
  return total;
}

// Применяет запланированные смены тарифа (pendingPlanId) после окончания периода
export async function applyPendingPlanChanges(): Promise<number> {
  const pending = await db.subscription.findMany({
    where: { status: 'ACTIVE', pendingPlanId: { not: null } },
    select: {
      id: true,
      planId: true,
      pendingPlanId: true,
      pendingPlanChangeAt: true,
      currentPeriodStart: true,
    },
  });

  // Применяем только те, где плановая дата смены уже прошла (период сменился)
  const toApply = pending.filter(
    (s) => s.pendingPlanChangeAt && s.pendingPlanChangeAt < s.currentPeriodStart,
  );

  if (toApply.length === 0) return 0;

  for (const sub of toApply) {
    await db.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { planId: sub.pendingPlanId!, pendingPlanId: null, pendingPlanChangeAt: null },
      });
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: 'DOWNGRADED',
          actorType: 'SYSTEM',
          payload: {
            fromPlanId: sub.planId,
            toPlanId: sub.pendingPlanId,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    });
  }

  logger.info({ count: toApply.length }, 'applyPendingPlanChanges: завершено');
  return toApply.length;
}

// Отправляет email за 3 дня до конца триала (идемпотентно через notification-маркер)
export async function processTrialEndingReminders(): Promise<number> {
  const now = new Date();
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in4days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const trials = await db.subscription.findMany({
    where: {
      status: 'TRIAL',
      trialEnd: { gte: in3days, lte: in4days },
    },
    select: {
      id: true,
      trialEnd: true,
      plan: { select: { name: true } },
      workspace: { select: { ownerId: true } },
    },
  });

  if (trials.length === 0) return 0;

  const appUrl = process.env.APP_URL ?? 'https://app.stroydocs.ru';
  let sent = 0;

  for (const sub of trials) {
    // Проверяем что напоминание ещё не было отправлено (маркер в таблице notification)
    const existing = await db.notification.findFirst({
      where: { userId: sub.workspace.ownerId, type: 'trial_ending_reminder' },
    });
    if (existing) continue;

    const owner = await db.user.findUnique({
      where: { id: sub.workspace.ownerId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!owner) continue;

    await db.notification.create({
      data: {
        type: 'trial_ending_reminder',
        title: 'Пробный период заканчивается',
        body: `Ваш пробный период завершится ${formatDate(sub.trialEnd!)}. Оформите подписку.`,
        userId: sub.workspace.ownerId,
      },
    });

    await enqueueBillingEmail({
      userId: sub.workspace.ownerId,
      email: owner.email,
      type: 'TRIAL_ENDING_SOON',
      subject: 'Ваш пробный период заканчивается',
      templateName: 'trial-ending-soon',
      data: {
        userName: buildUserName(owner.firstName, owner.lastName, owner.email),
        planName: sub.plan.name,
        appUrl,
        trialEndDate: formatDate(sub.trialEnd!),
      },
    });

    sent++;
  }

  if (sent > 0) logger.info({ sent }, 'processTrialEndingReminders: завершено');
  return sent;
}

// Отправляет retention-оффер через 3 дня после отмены при причине TOO_EXPENSIVE
export async function processRetentionOffers(): Promise<number> {
  const now = new Date();
  const cutoff3days = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const cutoff4days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const cancelled = await db.subscription.findMany({
    where: {
      status: 'CANCELLED',
      cancelReason: 'TOO_EXPENSIVE',
      canceledAt: { gte: cutoff3days, lte: cutoff4days },
    },
    select: {
      id: true,
      workspaceId: true,
      plan: { select: { name: true } },
      workspace: { select: { ownerId: true } },
    },
  });

  if (cancelled.length === 0) return 0;

  const appUrl = process.env.APP_URL ?? 'https://app.stroydocs.ru';
  let sent = 0;

  for (const sub of cancelled) {
    const existing = await db.notification.findFirst({
      where: { userId: sub.workspace.ownerId, type: 'retention_offer_sent' },
    });
    if (existing) continue;

    const owner = await db.user.findUnique({
      where: { id: sub.workspace.ownerId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!owner) continue;

    await db.notification.create({
      data: {
        type: 'retention_offer_sent',
        title: 'Специальное предложение',
        body: 'Вам доступна скидка 30% — промокод SKIDKA30-3M.',
        userId: sub.workspace.ownerId,
      },
    });

    await enqueueBillingEmail({
      userId: sub.workspace.ownerId,
      email: owner.email,
      type: 'RETENTION_DISCOUNT',
      subject: 'Специальное предложение — скидка 30%',
      templateName: 'retention-discount',
      data: {
        userName: buildUserName(owner.firstName, owner.lastName, owner.email),
        planName: sub.plan.name,
        appUrl,
        discountPercent: 30,
        promoCode: 'SKIDKA30-3M',
      },
    });

    sent++;
  }

  if (sent > 0) logger.info({ sent }, 'processRetentionOffers: завершено');
  return sent;
}
