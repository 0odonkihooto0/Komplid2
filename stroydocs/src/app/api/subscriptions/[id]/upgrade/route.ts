import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { upgradeSubscription } from '@/lib/payments/subscription-service';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const upgradeSchema = z.object({
  newPlanCode: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { session, workspaceId } = await getActiveWorkspaceOrThrow();

    const sub = await db.subscription.findFirst({
      where: { id: params.id, workspaceId, status: 'ACTIVE' },
    });
    if (!sub) return errorResponse('Активная подписка не найдена', 404);

    const body = await req.json();
    const parsed = upgradeSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const returnUrl = `${process.env.APP_URL ?? ''}/settings/subscription?upgraded=1`;

    const result = await upgradeSubscription({
      workspaceId,
      userId: session.user.id,
      newPlanCode: parsed.data.newPlanCode,
      billingPeriod: sub.billingPeriod,
      returnUrl,
    });

    if (result.path === 'charged') {
      return successResponse({ charged: true, paymentId: result.paymentId, amountRub: result.amountRub });
    }
    return successResponse({
      charged: false,
      confirmationToken: result.confirmationToken,
      paymentId: result.paymentId,
      amountRub: result.amountRub,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (error instanceof Error) return errorResponse(error.message, 400);
    return errorResponse('Ошибка при апгрейде подписки', 500);
  }
}
