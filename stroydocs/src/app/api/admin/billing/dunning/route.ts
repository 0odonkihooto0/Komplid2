import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { requireSystemAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const subs = await db.subscription.findMany({
      where: { status: { in: ['PAST_DUE', 'GRACE'] } },
      orderBy: { nextDunningAt: 'asc' },
      include: {
        plan: { select: { name: true, code: true } },
        workspace: {
          select: {
            id: true,
            name: true,
            owner: { select: { email: true, firstName: true, lastName: true } },
            organization: { select: { name: true } },
          },
        },
        dunningAttemptsList: {
          orderBy: { attemptNumber: 'desc' },
          take: 1,
          select: {
            attemptNumber: true,
            result: true,
            executedAt: true,
            failureReason: true,
          },
        },
      },
    });

    return successResponse(subs);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
