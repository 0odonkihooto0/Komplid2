import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { transitionToGrace } from '@/lib/payments/dunning-service';
import type { Prisma } from '@prisma/client';
import { requireSystemAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const sub = await db.subscription.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });
    if (!sub) return errorResponse('Подписка не найдена', 404);

    await transitionToGrace(params.id);

    await db.subscriptionEvent.create({
      data: {
        subscriptionId: params.id,
        type: 'GRACE_STARTED',
        actorType: 'ADMIN',
        actorUserId: session.user.id,
        payload: { triggeredBy: 'admin' } as unknown as Prisma.InputJsonValue,
      },
    });

    return successResponse({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
