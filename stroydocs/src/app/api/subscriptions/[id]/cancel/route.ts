import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CancellationReasonCode } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { cancelSubscription } from '@/lib/payments/subscription-service';
import { getNotificationQueue, enqueueNotification } from '@/lib/queue';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const cancelSchema = z.object({
  reason: z.nativeEnum(CancellationReasonCode).optional(),
  feedback: z.string().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { session, workspaceId } = await getActiveWorkspaceOrThrow();

    const sub = await db.subscription.findFirst({
      where: { id: params.id, workspaceId },
    });
    if (!sub) return errorResponse('Подписка не найдена', 404);
    if (sub.status !== 'ACTIVE' && sub.status !== 'TRIALING') {
      return errorResponse('Только активная подписка может быть отменена', 400);
    }

    const body = await req.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { reason, feedback } = parsed.data;

    await cancelSubscription({ workspaceId, userId: session.user.id, reason, feedback });

    // Подтверждение отмены — stub, обработчик в notification worker
    await enqueueNotification({
      userId: session.user.id,
      email: session.user.email,
      type: 'SUBSCRIPTION_CANCELLED',
      title: 'Подписка отменена',
      body: `Ваша подписка будет активна до ${sub.currentPeriodEnd.toLocaleDateString('ru-RU')}`,
    });

    // Win-back письмо через 3 дня для причины TOO_EXPENSIVE
    if (reason === CancellationReasonCode.TOO_EXPENSIVE) {
      const queue = getNotificationQueue();
      await queue.add(
        'send-email',
        {
          userId: session.user.id,
          email: session.user.email,
          type: 'RETENTION_WIN_BACK',
          title: 'Специальное предложение: скидка 30%',
          body: 'Используйте промокод SKIDKA30-3M для получения скидки 30% на 3 месяца',
        },
        { delay: 3 * 24 * 60 * 60 * 1000 },
      );
    }

    return successResponse({
      cancelledAt: new Date().toISOString(),
      effectiveEndDate: sub.currentPeriodEnd.toISOString(),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (error instanceof Error) return errorResponse(error.message, 400);
    return errorResponse('Ошибка при отмене подписки', 500);
  }
}
