import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { attemptDunningCharge } from '@/lib/payments/dunning-service';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.role !== 'ADMIN') return errorResponse('Недостаточно прав', 403);

    const sub = await db.subscription.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, dunningAttempts: true },
    });
    if (!sub) return errorResponse('Подписка не найдена', 404);
    if (sub.status !== 'PAST_DUE') return errorResponse('Подписка не в статусе PAST_DUE', 400);

    const nextAttempt = sub.dunningAttempts + 1;
    await attemptDunningCharge(params.id, nextAttempt);

    await db.subscriptionEvent.create({
      data: {
        subscriptionId: params.id,
        type: 'DUNNING_START',
        actorType: 'ADMIN',
        actorUserId: session.user.id,
        payload: {
          attemptNumber: nextAttempt,
          triggeredBy: 'admin',
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return successResponse({ ok: true, attemptNumber: nextAttempt });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
