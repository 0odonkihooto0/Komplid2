import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { scheduleDowngrade } from '@/lib/payments/subscription-service';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const downgradeSchema = z.object({
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
    const parsed = downgradeSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    await scheduleDowngrade({
      workspaceId,
      userId: session.user.id,
      newPlanCode: parsed.data.newPlanCode,
      billingPeriod: sub.billingPeriod,
    });

    return successResponse({ scheduledAt: sub.currentPeriodEnd.toISOString() });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (error instanceof Error) return errorResponse(error.message, 400);
    return errorResponse('Ошибка при планировании даунгрейда', 500);
  }
}
