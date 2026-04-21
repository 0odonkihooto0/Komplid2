import { db } from '@/lib/db';
import { getYookassaClient } from './yookassa-client';
import type { BillingPeriod } from '@prisma/client';

interface CreatePaymentParams {
  workspaceId: string;
  planId: string;
  billingPeriod: BillingPeriod;
  amountRub: number;          // в копейках
  userId: string;
  returnUrl: string;
  description: string;
  referralCreditApplied?: number;
  referralDiscountApplied?: number;
  referralId?: string;
}

interface CreatePaymentResult {
  paymentId: string;
  yookassaPaymentId: string;
  confirmationToken: string;
}

export async function createPayment(p: CreatePaymentParams): Promise<CreatePaymentResult> {
  const yookassa = getYookassaClient();
  const idempotenceKey = crypto.randomUUID();

  const yooPayment = await yookassa.createPayment(
    {
      amount: {
        value: (p.amountRub / 100).toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'embedded',
        return_url: p.returnUrl,
      },
      capture: true,
      description: p.description,
      save_payment_method: true,
      metadata: {
        workspaceId: p.workspaceId,
        planId: p.planId,
        billingPeriod: p.billingPeriod,
      },
    },
    idempotenceKey
  );

  const payment = await db.payment.create({
    data: {
      workspaceId: p.workspaceId,
      userId: p.userId,
      source: 'APP',
      status: 'PENDING',
      amountRub: p.amountRub,
      yookassaPaymentId: yooPayment.id,
      yookassaIdempotencyKey: idempotenceKey,
      referralCreditApplied: p.referralCreditApplied ?? 0,
      referralDiscountApplied: p.referralDiscountApplied ?? 0,
      referralId: p.referralId ?? null,
    },
  });

  // Тип confirmation из ЮKassa SDK — используем приведение для embedded token
  const confirmation = yooPayment.confirmation as { confirmation_token?: string };
  if (!confirmation?.confirmation_token) {
    throw new Error('ЮKassa не вернула confirmation_token');
  }

  return {
    paymentId: payment.id,
    yookassaPaymentId: yooPayment.id,
    confirmationToken: confirmation.confirmation_token,
  };
}
