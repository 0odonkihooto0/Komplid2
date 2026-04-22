import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createRefund } from '@/lib/payments/yookassa/refunds';

export const dynamic = 'force-dynamic';

const schema = z.object({
  paymentId: z.string().uuid(),
  // Сумма возврата в копейках (как хранится в БД)
  amountRub: z.number().int().min(1),
  reason: z.string().max(200).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.role !== 'ADMIN') return errorResponse('Недостаточно прав', 403);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { paymentId, amountRub, reason } = parsed.data;

    const payment = await db.payment.findFirst({
      where: { id: paymentId, subscriptionId: params.id },
    });
    if (!payment) return errorResponse('Платёж не найден', 404);
    if (payment.status !== 'SUCCEEDED') return errorResponse('Возврат возможен только для успешных платежей', 400);
    if (amountRub > payment.amountRub) return errorResponse('Сумма возврата превышает сумму платежа', 400);

    // Определяем ID платежа в ЮKassa
    const yooPaymentId = payment.yookassaPaymentId ?? payment.providerPaymentId;
    if (!yooPaymentId) return errorResponse('Нет ID платежа в ЮKassa — ручной возврат невозможен', 400);

    const refund = await createRefund({
      paymentId: yooPaymentId,
      amount: {
        value: (amountRub / 100).toFixed(2),
        currency: 'RUB',
      },
      description: reason ?? 'Возврат по решению администратора',
      idempotenceKey: `admin-refund-${paymentId}-${Date.now()}`,
    });

    const isFullRefund = amountRub >= payment.amountRub;

    await db.$transaction([
      db.payment.update({
        where: { id: paymentId },
        data: {
          status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          refundedAt: new Date(),
          refundedAmountRub: amountRub,
          refundReason: reason ?? 'Возврат администратором',
        },
      }),
      db.subscriptionEvent.create({
        data: {
          subscriptionId: params.id,
          type: 'CANCELLED',
          actorType: 'ADMIN',
          actorUserId: session.user.id,
          payload: {
            refund: true,
            paymentId,
            refundId: refund.id,
            amountRub,
            fullRefund: isFullRefund,
          } as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    return successResponse({ refundId: refund.id, status: refund.status, amountRub });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка возврата', 500);
  }
}
