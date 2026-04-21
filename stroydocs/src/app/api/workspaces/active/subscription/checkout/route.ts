export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { startSubscription } from '@/lib/payments/subscription-service';

const checkoutSchema = z.object({
  planCode: z.string().min(1),
  billingPeriod: z.enum(['MONTHLY', 'YEARLY']),
  promoCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, workspaceId } = await getActiveWorkspaceOrThrow();

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { planCode, billingPeriod, promoCode } = parsed.data;

    const returnUrl = `${process.env.APP_URL}/settings/subscription?success=1`;

    const result = await startSubscription({
      workspaceId,
      userId: session.user.id,
      planCode,
      billingPeriod,
      returnUrl,
      promoCode,
    });

    return successResponse({
      confirmationToken: result.confirmationToken,
      paymentId: result.paymentId,
      amountRub: result.amountRub,
      originalAmountRub: result.originalAmountRub,
      discountRub: result.discountRub,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (error instanceof Error) {
      if (error.message.includes('ЮKassa не настроена')) {
        return errorResponse('Оплата временно недоступна', 503);
      }
      if (error.message.includes('Бесплатный план')) {
        return errorResponse(error.message, 400);
      }
      if (error.message.includes('Тариф не найден')) {
        return errorResponse(error.message, 404);
      }
    }
    return errorResponse('Ошибка при создании платежа', 500);
  }
}
