import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const schema = z.object({
  days: z.number().int().min(1).max(365),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.role !== 'ADMIN') return errorResponse('Недостаточно прав', 403);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { days } = parsed.data;

    const sub = await db.subscription.findUnique({ where: { id: params.id } });
    if (!sub) return errorResponse('Подписка не найдена', 404);

    const previousPeriodEnd = sub.currentPeriodEnd;
    const newPeriodEnd = new Date(previousPeriodEnd.getTime() + days * 86400000);

    // Восстанавливаем статус если подписка истекла или в grace
    const shouldReactivate = sub.status === 'EXPIRED' || sub.status === 'PAST_DUE' || sub.status === 'GRACE';

    await db.$transaction([
      db.subscription.update({
        where: { id: params.id },
        data: {
          currentPeriodEnd: newPeriodEnd,
          ...(shouldReactivate ? {
            status: 'ACTIVE',
            graceUntil: null,
            nextDunningAt: null,
            dunningAttempts: 0,
          } : {}),
        },
      }),
      db.subscriptionEvent.create({
        data: {
          subscriptionId: params.id,
          type: 'MANUAL_EXTENSION',
          actorType: 'ADMIN',
          actorUserId: session.user.id,
          payload: {
            days,
            previousPeriodEnd: previousPeriodEnd.toISOString(),
            newPeriodEnd: newPeriodEnd.toISOString(),
          } as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    return successResponse({ newPeriodEnd, days });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
