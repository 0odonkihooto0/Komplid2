import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { requireSystemAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const sub = await db.subscription.findUnique({
      where: { id: params.id },
      include: {
        plan: true,
        workspace: {
          include: {
            owner: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
            organization: { select: { id: true, name: true, email: true } },
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            actorUser: { select: { email: true, firstName: true, lastName: true } },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            status: true,
            amountRub: true,
            refundedAmountRub: true,
            type: true,
            billingPeriod: true,
            yookassaPaymentId: true,
            providerPaymentId: true,
            paidAt: true,
            refundedAt: true,
            createdAt: true,
          },
        },
        dunningAttemptsList: {
          orderBy: { attemptNumber: 'desc' },
          take: 10,
          select: {
            id: true,
            attemptNumber: true,
            scheduledAt: true,
            executedAt: true,
            result: true,
            failureReason: true,
          },
        },
      },
    });

    if (!sub) return errorResponse('Подписка не найдена', 404);
    return successResponse(sub);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
