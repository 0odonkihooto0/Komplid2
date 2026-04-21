import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { startDunning, attemptDunningCharge, transitionToExpired } from '@/lib/payments/dunning-service';
import type { Prisma } from '@prisma/client';

// Переводит истёкшие триалы в EXPIRED и снимает активную подписку с воркспейса
export async function processExpiredTrials(): Promise<number> {
  const now = new Date();
  const expired = await db.subscription.findMany({
    where: { status: 'TRIAL', trialEnd: { lt: now } },
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
          type: 'subscription_expired',
          title: 'Пробный период завершён',
          body: 'Ваш 14-дневный пробный период закончился. Оформите подписку чтобы сохранить доступ к Pro-функциям.',
          userId: sub.workspace.ownerId,
        },
      });
    }
  });

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
