import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createPayment as createYooPayment, chargeRecurring } from './yookassa/payments';
import { buildSubscriptionReceipt } from './yookassa/receipts';
import { validateAndApplyPromoCode } from './promo-service';
import { calculateProration } from './proration';
import { applySuccessfulDunningPayment } from './dunning-service';
import { processReferralReward } from '@/lib/referrals/process-referral-payment';
import type { CancellationReasonCode, BillingPeriod, Prisma } from '@prisma/client';

// ─── helpers ────────────────────────────────────────────────────────────────

function addPeriod(date: Date, period: BillingPeriod): Date {
  const d = new Date(date);
  if (period === 'MONTHLY') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

async function getPlanByCode(code: string) {
  const plan = await db.subscriptionPlan.findUnique({ where: { code, isActive: true } });
  if (!plan) throw new Error(`Тариф не найден: ${code}`);
  return plan;
}

async function getActiveSubscription(workspaceId: string) {
  const ws = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { activeSubscriptionId: true },
  });
  if (!ws?.activeSubscriptionId) return null;
  return db.subscription.findUnique({
    where: { id: ws.activeSubscriptionId },
    include: { plan: true },
  });
}

// ─── startSubscription ───────────────────────────────────────────────────────

interface StartSubscriptionParams {
  workspaceId: string;
  userId: string;
  planCode: string;
  billingPeriod: BillingPeriod;
  returnUrl: string;
  promoCode?: string;
}

interface StartSubscriptionResult {
  confirmationToken: string;
  paymentId: string;
  amountRub: number;
  originalAmountRub: number;
  discountRub: number;
}

/**
 * Создаёт платёж для первичной оплаты подписки.
 * Применяет промокод и кредиты workspace, если переданы.
 */
export async function startSubscription(params: StartSubscriptionParams): Promise<StartSubscriptionResult> {
  const { workspaceId, userId, planCode, billingPeriod, returnUrl, promoCode } = params;

  const plan = await getPlanByCode(planCode);

  const originalAmountRub = billingPeriod === 'MONTHLY' ? plan.priceMonthlyRub : plan.priceYearlyRub;
  if (originalAmountRub <= 0) throw new Error('Бесплатный план не требует оплаты');

  // Промокод
  let promoCodeId: string | undefined;
  let discountRub = 0;
  if (promoCode) {
    const result = await validateAndApplyPromoCode({
      code: promoCode,
      workspaceId,
      planId: plan.id,
      planCategory: plan.category,
      originalAmountRub,
    });
    if (result) {
      promoCodeId = result.promoCode.id;
      discountRub = result.discountRub;
    }
  }

  // Кредиты workspace
  const creditRecord = await db.workspaceCredit.findUnique({ where: { workspaceId } });
  const creditBalance = creditRecord?.balanceRub ?? 0;
  const creditApplied = Math.min(creditBalance, Math.max(0, originalAmountRub - discountRub));

  const finalAmountRub = Math.max(0, originalAmountRub - discountRub - creditApplied);

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, phone: true } });
  if (!user) throw new Error('Пользователь не найден');

  const idempotenceKey = crypto.randomUUID();
  const description = `${plan.name} — ${billingPeriod === 'MONTHLY' ? 'месяц' : 'год'}`;

  const receipt = buildSubscriptionReceipt({
    email: user.email,
    phone: user.phone ?? undefined,
    plan: { name: plan.name, priceRub: originalAmountRub },
    billingPeriod,
  });

  const yooPayment = await createYooPayment({
    amount: { value: (finalAmountRub / 100).toFixed(2), currency: 'RUB' },
    description,
    metadata: {
      workspaceId,
      planId: plan.id,
      billingPeriod,
      paymentType: 'PLAN_PAYMENT',
    },
    idempotenceKey,
    returnUrl,
    confirmation: 'embedded',
    savePaymentMethod: true,
    capture: true,
    receipt,
  });

  const confirmation = yooPayment.confirmation as { confirmation_token?: string } | undefined;
  if (!confirmation?.confirmation_token) {
    throw new Error('ЮKassa не вернула confirmation_token');
  }

  // Сохранить платёж в БД
  const payment = await db.payment.create({
    data: {
      workspaceId,
      userId,
      source: 'APP',
      status: 'PENDING',
      amountRub: finalAmountRub,
      originalAmountRub,
      type: 'PLAN_PAYMENT',
      billingPeriod,
      description,
      provider: 'YOOKASSA',
      providerPaymentId: yooPayment.id,
      providerIdempotenceKey: idempotenceKey,
      savePaymentMethod: true,
      yookassaPaymentId: yooPayment.id,
      yookassaIdempotencyKey: idempotenceKey,
      discountRub: discountRub + creditApplied,
      promoCodeId,
      referralCreditApplied: creditApplied,
      metadata: { planCode, promoCode } as unknown as Prisma.InputJsonValue,
    },
  });

  // Применить кредиты немедленно (резервирование)
  if (creditApplied > 0 && creditRecord) {
    await db.$transaction([
      db.workspaceCredit.update({
        where: { workspaceId },
        data: { balanceRub: { decrement: creditApplied } },
      }),
      db.creditLedgerEntry.create({
        data: {
          creditId: creditRecord.id,
          amountRub: -creditApplied,
          type: 'PAYMENT_DEDUCTION',
          description: `Списание в счёт оплаты подписки: ${description}`,
          paymentId: payment.id,
        },
      }),
    ]);
  }

  // Зафиксировать применение промокода (после создания платежа)
  if (promoCodeId) {
    await db.$transaction([
      db.promoCodeRedemption.create({
        data: {
          promoCodeId,
          workspaceId,
          userId,
          paymentId: payment.id,
          discountAppliedRub: discountRub,
        },
      }),
      db.promoCode.update({
        where: { id: promoCodeId },
        data: { redemptionsCount: { increment: 1 } },
      }),
    ]);
  }

  return {
    confirmationToken: confirmation.confirmation_token,
    paymentId: payment.id,
    amountRub: finalAmountRub,
    originalAmountRub,
    discountRub: discountRub + creditApplied,
  };
}

// ─── upgradeSubscription ─────────────────────────────────────────────────────

interface UpgradeSubscriptionParams {
  workspaceId: string;
  userId: string;
  newPlanCode: string;
  billingPeriod: BillingPeriod;
  returnUrl: string;
}

type UpgradeSubscriptionResult =
  | { path: 'charged'; paymentId: string; amountRub: number }
  | { path: 'checkout'; confirmationToken: string; paymentId: string; amountRub: number };

/**
 * Создаёт платёж для апгрейда тарифа с prorаtion-доплатой за остаток периода.
 * Если есть сохранённая карта — списывает мгновенно, иначе создаёт checkout.
 */
export async function upgradeSubscription(params: UpgradeSubscriptionParams): Promise<UpgradeSubscriptionResult> {
  const { workspaceId, userId, newPlanCode, billingPeriod, returnUrl } = params;

  const sub = await getActiveSubscription(workspaceId);
  if (!sub) throw new Error('Активная подписка не найдена');

  const newPlan = await getPlanByCode(newPlanCode);
  const newPriceRub = billingPeriod === 'MONTHLY' ? newPlan.priceMonthlyRub : newPlan.priceYearlyRub;
  const oldPriceRub = sub.billingPeriod === 'MONTHLY' ? sub.plan.priceMonthlyRub : sub.plan.priceYearlyRub;

  const { proratedAmountRub } = calculateProration({
    currentPeriodEnd: sub.currentPeriodEnd,
    oldPriceRub,
    newPriceRub,
    billingPeriod: sub.billingPeriod,
  });

  const amountRub = Math.max(proratedAmountRub, 0);
  const idempotenceKey = crypto.randomUUID();
  const description = `Апгрейд на ${newPlan.name}`;

  // Ищем активную сохранённую карту
  const savedCard = sub.defaultPaymentMethodId
    ? await db.paymentMethod.findFirst({
        where: { id: sub.defaultPaymentMethodId, isActive: true },
      })
    : await db.paymentMethod.findFirst({
        where: { workspaceId, isDefault: true, isActive: true },
      });

  // Запланировать смену плана (применится в handleSuccessfulPayment или мгновенно)
  await db.subscription.update({
    where: { id: sub.id },
    data: { pendingPlanId: newPlan.id, pendingPlanChangeAt: new Date() },
  });

  if (savedCard && amountRub > 0) {
    // Путь с сохранённой картой — мгновенное списание
    const payment = await db.payment.create({
      data: {
        workspaceId,
        userId,
        subscriptionId: sub.id,
        source: 'APP',
        status: 'PENDING',
        amountRub,
        originalAmountRub: amountRub,
        type: 'PLAN_UPGRADE',
        billingPeriod,
        description,
        provider: 'YOOKASSA',
        providerIdempotenceKey: idempotenceKey,
        paymentMethodId: savedCard.id,
        metadata: { newPlanCode, oldPlanCode: sub.plan.code, paymentType: 'PLAN_UPGRADE' } as unknown as Prisma.InputJsonValue,
      },
    });

    const ykPayment = await chargeRecurring({
      paymentMethodId: savedCard.providerMethodId,
      amount: { value: (amountRub / 100).toFixed(2), currency: 'RUB' },
      description,
      metadata: { paymentDbId: payment.id, subscriptionId: sub.id, paymentType: 'PLAN_UPGRADE' },
      idempotenceKey,
    });

    await db.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: ykPayment.id },
    });

    if (ykPayment.status === 'succeeded') {
      // Применяем апгрейд немедленно
      await applySuccessfulDunningPayment(sub.id, payment.id, billingPeriod);
      await db.subscription.update({
        where: { id: sub.id },
        data: { planId: newPlan.id, pendingPlanId: null, pendingPlanChangeAt: null },
      });
      await db.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: 'UPGRADED',
          actorType: 'WEBHOOK',
          payload: { paymentId: payment.id, newPlanCode, amountRub } as unknown as Prisma.InputJsonValue,
        },
      });
    }
    // Если status === 'pending' — webhook обработает через handleSuccessfulPayment

    return { path: 'charged', paymentId: payment.id, amountRub };
  }

  // Путь без карты — YooKassa checkout
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, phone: true } });
  if (!user) throw new Error('Пользователь не найден');

  const receipt = buildSubscriptionReceipt({
    email: user.email,
    phone: user.phone ?? undefined,
    plan: { name: newPlan.name, priceRub: amountRub },
    billingPeriod,
  });

  const yooPayment = await createYooPayment({
    amount: { value: (amountRub / 100).toFixed(2), currency: 'RUB' },
    description,
    metadata: {
      workspaceId,
      planId: newPlan.id,
      subscriptionId: sub.id,
      billingPeriod,
      paymentType: 'PLAN_UPGRADE',
    },
    idempotenceKey,
    returnUrl,
    confirmation: 'embedded',
    savePaymentMethod: true,
    capture: true,
    receipt,
  });

  const confirmation = yooPayment.confirmation as { confirmation_token?: string } | undefined;
  if (!confirmation?.confirmation_token) {
    throw new Error('ЮKassa не вернула confirmation_token');
  }

  const payment = await db.payment.create({
    data: {
      workspaceId,
      userId,
      subscriptionId: sub.id,
      source: 'APP',
      status: 'PENDING',
      amountRub,
      originalAmountRub: amountRub,
      type: 'PLAN_UPGRADE',
      billingPeriod,
      description,
      provider: 'YOOKASSA',
      providerPaymentId: yooPayment.id,
      providerIdempotenceKey: idempotenceKey,
      savePaymentMethod: true,
      yookassaPaymentId: yooPayment.id,
      yookassaIdempotencyKey: idempotenceKey,
      metadata: { newPlanCode, oldPlanCode: sub.plan.code, paymentType: 'PLAN_UPGRADE' } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    path: 'checkout',
    confirmationToken: confirmation.confirmation_token,
    paymentId: payment.id,
    amountRub,
  };
}

// ─── scheduleDowngrade ───────────────────────────────────────────────────────

/**
 * Запланировать переход на тариф ниже в конце текущего периода.
 * Платёж не создаётся — смена произойдёт при следующем автопродлении.
 */
export async function scheduleDowngrade(params: {
  workspaceId: string;
  userId: string;
  newPlanCode: string;
  billingPeriod: BillingPeriod;
}): Promise<void> {
  const { workspaceId, userId, newPlanCode, billingPeriod } = params;

  const sub = await getActiveSubscription(workspaceId);
  if (!sub) throw new Error('Активная подписка не найдена');

  const newPlan = await getPlanByCode(newPlanCode);

  await db.subscription.update({
    where: { id: sub.id },
    data: { pendingPlanId: newPlan.id, pendingPlanChangeAt: sub.currentPeriodEnd },
  });

  await db.subscriptionEvent.create({
    data: {
      subscriptionId: sub.id,
      type: 'PLAN_CHANGE_SCHEDULED',
      actorType: 'USER',
      actorUserId: userId,
      payload: {
        fromPlanCode: sub.plan.code,
        toPlanCode: newPlanCode,
        billingPeriod,
        effectiveAt: sub.currentPeriodEnd.toISOString(),
      } as unknown as Prisma.InputJsonValue,
    },
  });
}

// ─── cancelSubscription ──────────────────────────────────────────────────────

/**
 * Отмена автопродления в конце текущего периода.
 */
export async function cancelSubscription(params: {
  workspaceId: string;
  userId: string;
  reason?: CancellationReasonCode;
  feedback?: string;
}): Promise<void> {
  const { workspaceId, userId, reason, feedback } = params;

  const sub = await getActiveSubscription(workspaceId);
  if (!sub) throw new Error('Активная подписка не найдена');

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      status: 'CANCELLED',
      effectiveEndDate: sub.currentPeriodEnd,
      cancelReason: reason,
      cancelFeedback: feedback,
    },
  });

  await db.subscriptionEvent.create({
    data: {
      subscriptionId: sub.id,
      type: 'CANCELLED',
      actorType: 'USER',
      actorUserId: userId,
      payload: {
        reason: reason ?? null,
        feedback: feedback ?? null,
        effectiveEndDate: sub.currentPeriodEnd.toISOString(),
      } as unknown as Prisma.InputJsonValue,
    },
  });
}

// ─── reactivateSubscription ──────────────────────────────────────────────────

/**
 * Отмена запланированной отмены (пользователь передумал).
 */
export async function reactivateSubscription(params: {
  workspaceId: string;
  userId: string;
}): Promise<void> {
  const { workspaceId, userId } = params;

  const sub = await getActiveSubscription(workspaceId);
  if (!sub) throw new Error('Активная подписка не найдена');
  if (!sub.cancelAtPeriodEnd) throw new Error('Подписка не находится в статусе отмены');

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      status: 'ACTIVE',
      effectiveEndDate: null,
      cancelReason: null,
      cancelFeedback: null,
    },
  });

  await db.subscriptionEvent.create({
    data: {
      subscriptionId: sub.id,
      type: 'REACTIVATED',
      actorType: 'USER',
      actorUserId: userId,
      payload: {} as unknown as Prisma.InputJsonValue,
    },
  });
}

// ─── handleSuccessfulPayment ─────────────────────────────────────────────────

interface SuccessfulPaymentParams {
  paymentDbId: string;
  yooPaymentId: string;
  yooMetadata: Record<string, string>;
}

/**
 * Обрабатывает payment.succeeded от ЮKassa:
 * активирует/обновляет подписку, обрабатывает реферальные бонусы.
 */
export async function handleSuccessfulPayment(params: SuccessfulPaymentParams): Promise<void> {
  const { paymentDbId, yooPaymentId, yooMetadata } = params;

  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentDbId } });
    if (!payment) throw new Error(`Платёж не найден: ${paymentDbId}`);

    // Идемпотентность
    if (payment.status === 'SUCCEEDED') return;

    await tx.payment.update({
      where: { id: paymentDbId },
      data: { status: 'SUCCEEDED', paidAt: new Date(), capturedAt: new Date() },
    });

    const planId = yooMetadata.planId ?? '';
    const billingPeriod = (yooMetadata.billingPeriod ?? 'MONTHLY') as BillingPeriod;

    const now = new Date();
    const periodEnd = addPeriod(now, billingPeriod);

    const existingSub = payment.subscriptionId
      ? await tx.subscription.findUnique({ where: { id: payment.subscriptionId } })
      : null;

    let subId: string;

    if (existingSub) {
      // Продление или апгрейд существующей подписки
      const pendingPlanId = existingSub.pendingPlanId;
      const updated = await tx.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: 'ACTIVE',
          planId: pendingPlanId ?? existingSub.planId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          pendingPlanId: null,
          dunningAttempts: 0,
          nextDunningAt: null,
          graceUntil: null,
        },
      });
      subId = updated.id;

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subId,
          type: pendingPlanId ? 'UPGRADED' : 'RENEWED',
          actorType: 'WEBHOOK',
          payload: {
            paymentId: paymentDbId,
            yooPaymentId,
            amountRub: payment.amountRub,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      // Новая подписка
      const created = await tx.subscription.create({
        data: {
          workspaceId: payment.workspaceId,
          planId,
          status: 'ACTIVE',
          billingPeriod,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          startedAt: now,
        } as Prisma.SubscriptionUncheckedCreateInput,
      });
      subId = created.id;

      await tx.payment.update({
        where: { id: paymentDbId },
        data: { subscriptionId: subId },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subId,
          type: 'CREATED',
          actorType: 'WEBHOOK',
          payload: {
            paymentId: paymentDbId,
            yooPaymentId,
            planId,
            billingPeriod,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await tx.workspace.update({
      where: { id: payment.workspaceId },
      data: { activeSubscriptionId: subId },
    });

    if (payment.referralId) {
      const freshPayment = { ...payment, status: 'SUCCEEDED' as const, paidAt: new Date() };
      await processReferralReward(tx, freshPayment);
    }
  });

  logger.info({ paymentId: paymentDbId }, 'Subscription activated via payment.succeeded');
}

// ─── handleCancelledPayment ──────────────────────────────────────────────────

/**
 * Обрабатывает payment.canceled от ЮKassa.
 * Возвращает кредиты если они были списаны.
 */
export async function handleCancelledPayment(params: { paymentDbId: string }): Promise<void> {
  const { paymentDbId } = params;

  const payment = await db.payment.findUnique({ where: { id: paymentDbId } });
  if (!payment) return;
  if (payment.status === 'CANCELLED') return;

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentDbId },
      data: { status: 'CANCELLED', failedAt: new Date() },
    });

    // Вернуть кредиты если были списаны при старте платежа
    const creditApplied = payment.referralCreditApplied ?? 0;
    if (creditApplied > 0) {
      const credit = await tx.workspaceCredit.findUnique({ where: { workspaceId: payment.workspaceId } });
      if (credit) {
        await tx.workspaceCredit.update({
          where: { workspaceId: payment.workspaceId },
          data: { balanceRub: { increment: creditApplied } },
        });
        await tx.creditLedgerEntry.create({
          data: {
            creditId: credit.id,
            amountRub: creditApplied,
            type: 'REFUND',
            description: 'Возврат кредитов после отмены платежа',
            paymentId: paymentDbId,
          },
        });
      }
    }
  });

  logger.info({ paymentId: paymentDbId }, 'Payment cancelled');
}

// ─── handleSuccessfulRefund ──────────────────────────────────────────────────

/**
 * Обрабатывает refund.succeeded от ЮKassa.
 */
export async function handleSuccessfulRefund(params: { paymentDbId: string }): Promise<void> {
  const { paymentDbId } = params;

  const payment = await db.payment.findUnique({ where: { id: paymentDbId } });
  if (!payment) return;
  if (payment.status === 'REFUNDED') return;

  await db.payment.update({
    where: { id: paymentDbId },
    data: { status: 'REFUNDED', refundedAt: new Date() },
  });

  if (payment.subscriptionId) {
    const sub = await db.subscription.findUnique({ where: { id: payment.subscriptionId } });
    if (sub) {
      await db.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: 'CANCELLED',
          actorType: 'WEBHOOK',
          payload: {
            paymentId: paymentDbId,
            reason: 'refund',
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  logger.info({ paymentId: paymentDbId }, 'Refund processed');
}
