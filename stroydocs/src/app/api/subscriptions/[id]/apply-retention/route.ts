import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const retentionSchema = z.object({
  offerType: z.enum(['PROMO_CODE', 'PAUSE', 'FEEDBACK']),
  feedback: z.string().max(2000).optional(),
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

    const body = await req.json();
    const parsed = retentionSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { offerType, feedback } = parsed.data;

    if (offerType === 'PROMO_CODE') {
      const promoCode = await db.promoCode.upsert({
        where: { code: 'SKIDKA30-3M' },
        create: {
          code: 'SKIDKA30-3M',
          discountType: 'PERCENT',
          discountValue: 30,
          isFirstPaymentOnly: false,
          source: 'retention',
        },
        update: {},
      });

      await db.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: 'PROMO_APPLIED',
          actorType: 'USER',
          actorUserId: session.user.id,
          payload: { offerType: 'PROMO_CODE', promoCode: promoCode.code } as unknown as Prisma.InputJsonValue,
        },
      });

      return successResponse({ promoCode: promoCode.code });
    }

    if (offerType === 'PAUSE') {
      await db.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: 'PROMO_APPLIED',
          actorType: 'USER',
          actorUserId: session.user.id,
          payload: { offerType: 'PAUSE' } as unknown as Prisma.InputJsonValue,
        },
      });
      return successResponse({ message: 'Мы свяжемся с вами в ближайшее время' });
    }

    // FEEDBACK — сохраняем отзыв в подписке
    await db.subscription.update({
      where: { id: sub.id },
      data: { cancelFeedback: feedback ?? '' },
    });

    return successResponse({ saved: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (error instanceof Error) return errorResponse(error.message, 400);
    return errorResponse('Ошибка при применении предложения', 500);
  }
}
