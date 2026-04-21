import { db } from '@/lib/db';
import type { SubscriptionPlan, Subscription } from '@prisma/client';

export interface ActivePlanResult {
  plan: SubscriptionPlan;
  subscription: Subscription | null;
  isInGracePeriod: boolean;
}

export async function getActivePlan(workspaceId: string): Promise<ActivePlanResult | null> {
  const ws = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      activeSubscription: {
        include: { plan: true },
      },
    },
  });

  if (!ws) return null;

  const getFreePlan = async () => {
    const freePlan = await db.subscriptionPlan.findUnique({ where: { code: 'free' } });
    return freePlan ? { plan: freePlan, subscription: null, isInGracePeriod: false } : null;
  };

  if (!ws.activeSubscription) {
    return getFreePlan();
  }

  const sub = ws.activeSubscription;
  const now = new Date();

  // Подписка истекла или отменена и период закончился
  if (
    sub.status === 'EXPIRED' ||
    (sub.status === 'CANCELED' && sub.currentPeriodEnd < now)
  ) {
    return getFreePlan();
  }

  // Grace period: 7 дней после PAST_DUE
  const isInGracePeriod =
    sub.status === 'PAST_DUE' &&
    now.getTime() - sub.currentPeriodEnd.getTime() < 7 * 24 * 60 * 60 * 1000;

  return {
    plan: sub.plan,
    subscription: sub,
    isInGracePeriod,
  };
}
