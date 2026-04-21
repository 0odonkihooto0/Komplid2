import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

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

// Переводит активные подписки с истёкшим периодом в PAST_DUE
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

  await db.$transaction(async (tx) => {
    for (const sub of expired) {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'PAST_DUE' },
      });
      await tx.notification.create({
        data: {
          type: 'subscription_past_due',
          title: 'Требуется оплата подписки',
          body: 'Срок вашей подписки истёк. Оплатите счёт для продолжения работы.',
          userId: sub.workspace.ownerId,
        },
      });
    }
  });

  logger.info({ count: expired.length }, 'processExpiredSubscriptions: завершено');
  return expired.length;
}

// Переводит PAST_DUE старше 7 дней в EXPIRED, снимает активную подписку
export async function processExpiredGracePeriods(): Promise<number> {
  const graceCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const expired = await db.subscription.findMany({
    where: { status: 'PAST_DUE', currentPeriodEnd: { lt: graceCutoff } },
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
          title: 'Подписка отключена',
          body: 'Льготный период оплаты истёк. Доступ к Pro-функциям приостановлен.',
          userId: sub.workspace.ownerId,
        },
      });
    }
  });

  logger.info({ count: expired.length }, 'processExpiredGracePeriods: завершено');
  return expired.length;
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
