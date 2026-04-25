import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { Prisma, SubscriptionStatus, BillingPeriod } from '@prisma/client';
import { requireSystemAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const billingPeriod = searchParams.get('billingPeriod');
    const search = searchParams.get('search') ?? '';
    const skip = Math.max(0, Number(searchParams.get('skip') ?? 0));
    const take = Math.min(200, Math.max(1, Number(searchParams.get('take') ?? 50)));

    const where: Prisma.SubscriptionWhereInput = {};
    if (status && status !== 'ALL') where.status = status as SubscriptionStatus;
    if (billingPeriod && billingPeriod !== 'ALL') where.billingPeriod = billingPeriod as BillingPeriod;
    if (search) {
      where.workspace = {
        OR: [
          { organization: { name: { contains: search, mode: 'insensitive' } } },
          { owner: { email: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const [items, total] = await db.$transaction([
      db.subscription.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: { select: { name: true, code: true, priceMonthlyRub: true, priceYearlyRub: true } },
          workspace: {
            select: {
              id: true,
              name: true,
              owner: { select: { email: true, firstName: true, lastName: true } },
              organization: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.subscription.count({ where }),
    ]);

    return successResponse(items, { total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
