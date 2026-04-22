import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    if (session.user.role !== 'ADMIN') return errorResponse('Недостаточно прав', 403);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    // MRR: сумма месячных эквивалентов всех активных подписок (в копейках)
    const activeSubs = await db.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: { select: { priceMonthlyRub: true, priceYearlyRub: true } } },
    });

    const mrrKopecks = activeSubs.reduce((sum, sub) => {
      if (sub.billingPeriod === 'MONTHLY') return sum + sub.plan.priceMonthlyRub;
      if (sub.billingPeriod === 'YEARLY') return sum + Math.round(sub.plan.priceYearlyRub / 12);
      return sum;
    }, 0);

    const mrr = Math.round(mrrKopecks / 100); // в рублях
    const arr = mrr * 12;

    const [
      churnedCount,
      activeAtStart,
      activeCount,
      trialCount,
      pastDueCount,
      newLast30d,
    ] = await db.$transaction([
      db.subscription.count({
        where: {
          status: { in: ['CANCELLED', 'EXPIRED'] },
          canceledAt: { gte: thirtyDaysAgo },
        },
      }),
      db.subscription.count({
        where: {
          status: { in: ['ACTIVE', 'PAST_DUE', 'GRACE'] },
          currentPeriodStart: { lte: thirtyDaysAgo },
        },
      }),
      db.subscription.count({ where: { status: 'ACTIVE' } }),
      db.subscription.count({ where: { status: 'TRIALING' } }),
      db.subscription.count({ where: { status: 'PAST_DUE' } }),
      db.subscription.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    const churnRate = activeAtStart > 0
      ? Math.round((churnedCount / activeAtStart) * 10000) / 100
      : 0;

    return successResponse({
      mrr,
      arr,
      churnRate,
      activeCount,
      trialCount,
      pastDueCount,
      churnedLast30: churnedCount,
      newLast30d,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
