import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { BillingPeriod, Prisma } from '@prisma/client';
import { processReferralReward } from '@/lib/referrals/process-referral-payment';

// IP-allowlist ЮKassa (https://yookassa.ru/developers/using-api/webhooks)
const YOOKASSA_IPS = [
  '185.71.76.', '185.71.77.',   // /27 — первые 3 октета
  '77.75.153.', '77.75.154.',   // /25
  '77.75.156.11', '77.75.156.35',
];

function isYookassaIp(ip: string): boolean {
  if (ip.startsWith('2a02:5180:')) return true; // IPv6 /32
  return YOOKASSA_IPS.some((allowed) =>
    allowed.endsWith('.') ? ip.startsWith(allowed) : ip === allowed
  );
}

function addPeriod(date: Date, period: BillingPeriod): Date {
  const d = new Date(date);
  if (period === 'MONTHLY') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

export async function POST(req: NextRequest) {
  // Проверка IP отправителя
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '';
  if (ip && !isYookassaIp(ip)) {
    logger.warn({ ip }, 'Webhook: отклонён запрос с неизвестного IP');
    return new NextResponse(null, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const event = body.event as string | undefined;
  const yooPayment = body.object as Record<string, unknown> | undefined;

  if (!event || !yooPayment) {
    return NextResponse.json({ ok: true });
  }

  // Игнорируем неизвестные события
  if (!['payment.succeeded', 'payment.canceled', 'refund.succeeded'].includes(event)) {
    return NextResponse.json({ ok: true });
  }

  const yooId = yooPayment.id as string | undefined;
  if (!yooId) return NextResponse.json({ ok: true });

  const payment = await db.payment.findUnique({
    where: { yookassaPaymentId: yooId },
  });

  if (!payment) {
    logger.warn({ yooId }, 'Webhook: платёж не найден в БД');
    return NextResponse.json({ ok: true });
  }

  if (event === 'payment.succeeded') {
    // Идемпотентность
    if (payment.status === 'SUCCEEDED') {
      return NextResponse.json({ ok: true });
    }

    const meta = yooPayment.metadata as Record<string, string> | undefined;
    const planId = meta?.planId ?? '';
    const billingPeriod = (meta?.billingPeriod ?? 'MONTHLY') as BillingPeriod;

    try {
      await db.$transaction(async (tx) => {
        // Обновить платёж
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCEEDED', paidAt: new Date() },
        });

        const now = new Date();
        const periodEnd = addPeriod(now, billingPeriod);

        // Найти или создать подписку
        const existingSub = payment.subscriptionId
          ? await tx.subscription.findUnique({ where: { id: payment.subscriptionId } })
          : null;

        let subId: string;
        if (existingSub) {
          const updated = await tx.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: 'ACTIVE',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
            },
          });
          subId = updated.id;
        } else {
          const created = await tx.subscription.create({
            data: {
              workspaceId: payment.workspaceId,
              planId,
              status: 'ACTIVE',
              billingPeriod,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            } as Prisma.SubscriptionUncheckedCreateInput,
          });
          subId = created.id;
          // Привязать платёж к подписке
          await tx.payment.update({
            where: { id: payment.id },
            data: { subscriptionId: subId },
          });
        }

        // Установить активную подписку workspace
        await tx.workspace.update({
          where: { id: payment.workspaceId },
          data: { activeSubscriptionId: subId },
        });

        // Реферальные бонусы (Фаза 5)
        if (payment.referralId) {
          // Передаём свежую копию payment с обновлённым статусом
          const freshPayment = { ...payment, status: 'SUCCEEDED' as const, paidAt: new Date() };
          await processReferralReward(tx, freshPayment);
        }
      });

      logger.info({ paymentId: payment.id }, 'Webhook: подписка активирована');
    } catch (err) {
      logger.error({ err, paymentId: payment.id }, 'Webhook: ошибка активации подписки');
      return new NextResponse(null, { status: 500 });
    }
  }

  if (event === 'payment.canceled') {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failedAt: new Date() },
    });
  }

  if (event === 'refund.succeeded') {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
