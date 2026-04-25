import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
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
    if (sub.status === 'CANCELLED') return errorResponse('Подписка уже отменена', 400);

    await db.$transaction([
      db.subscription.update({
        where: { id: params.id },
        data: {
          status: 'CANCELLED',
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
          effectiveEndDate: new Date(),
          cancelReason: 'OTHER',
        },
      }),
      db.subscriptionEvent.create({
        data: {
          subscriptionId: params.id,
          type: 'CANCELLED',
          actorType: 'ADMIN',
          actorUserId: session.user.id,
          payload: {
            reason: 'Отменено администратором',
            immediate: true,
          } as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    return successResponse({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
