import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createPayment } from '@/lib/payments/create-payment';
export const dynamic = 'force-dynamic';


const checkoutSchema = z.object({
  planCode: z.string().min(1),
  billingPeriod: z.enum(['MONTHLY', 'YEARLY']),
  referralCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, workspaceId } = await getActiveWorkspaceOrThrow();

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { planCode, billingPeriod } = parsed.data;

    // Загрузить план по коду
    const plan = await db.subscriptionPlan.findUnique({
      where: { code: planCode, isActive: true },
    });
    if (!plan) return errorResponse('Тариф не найден', 404);

    // Вычислить сумму в зависимости от периода
    const amountRub = billingPeriod === 'MONTHLY'
      ? plan.priceMonthlyRub
      : plan.priceYearlyRub;

    if (amountRub <= 0) {
      return errorResponse('Бесплатный план не требует оплаты', 400);
    }

    const returnUrl = `${process.env.APP_URL}/settings/subscription?success=1`;
    const description = `${plan.name} — ${billingPeriod === 'MONTHLY' ? 'месяц' : 'год'}`;

    // Реферальные коды — Фаза 5, пока заглушка
    const referralDiscountApplied = 0;
    const referralId: string | undefined = undefined;

    const finalAmount = amountRub - referralDiscountApplied;

    const result = await createPayment({
      workspaceId,
      planId: plan.id,
      billingPeriod,
      amountRub: finalAmount,
      userId: session.user.id,
      returnUrl,
      description,
      referralDiscountApplied,
      referralId,
    });

    return successResponse({
      confirmationToken: result.confirmationToken,
      paymentId: result.paymentId,
      amountRub: finalAmount,
      originalAmountRub: amountRub,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (error instanceof Error && error.message.includes('ЮKassa не настроена')) {
      return errorResponse('Оплата временно недоступна', 503);
    }
    return errorResponse('Ошибка при создании платежа', 500);
  }
}
