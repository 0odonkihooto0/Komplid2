export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isYookassaIp } from '@/lib/payments/yookassa/webhooks';
import { processReferralReward } from '@/lib/referrals/process-referral-payment';
import type { BillingPeriod, Prisma } from '@prisma/client';

const HANDLED_EVENTS = [
  'payment.succeeded',
  'payment.canceled',
  'payment.waiting_for_capture',
  'refund.succeeded',
] as const;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '';
}

function addPeriod(date: Date, period: BillingPeriod): Date {
  const d = new Date(date);
  if (period === 'MONTHLY') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

export async function POST(req: NextRequest) {
  // 1. Проверка IP — пустая строка (локальная разработка без прокси) пропускается
  const clientIp = getClientIp(req);
  if (clientIp && !isYookassaIp(clientIp)) {
    logger.warn({ clientIp }, 'Webhook: отклонён запрос с неизвестного IP');
    return new NextResponse(null, { status: 403 });
  }

  // 2. Парсинг тела
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const event = body.event as string | undefined;
  const yooObj = body.object as Record<string, unknown> | undefined;

  if (!event || !yooObj) {
    return NextResponse.json({ ok: true });
  }

  // 3. Игнорируем неизвестные события
  if (!(HANDLED_EVENTS as ReadonlyArray<string>).includes(event)) {
    return NextResponse.json({ ok: true });
  }

  const yooId = yooObj.id as string | undefined;
  if (!yooId) return NextResponse.json({ ok: true });

  // 4. Поиск платежа: поддерживаем оба поля для обратной совместимости.
  //    Старые платежи имеют yookassaPaymentId, новые — providerPaymentId.
  const payment = await db.payment.findFirst({
    where: {
      OR: [{ providerPaymentId: yooId }, { yookassaPaymentId: yooId }],
    },
  });

  if (!payment) {
    logger.warn({ yooId }, 'Webhook: платёж не найден в БД');
    // Возвращаем 200 — иначе ЮKassa будет бесконечно ретраить
    return NextResponse.json({ ok: true });
  }

  // ─── payment.succeeded ───────────────────────────────────────────────────

  if (event === 'payment.succeeded') {
    // Идемпотентность
    if (payment.status === 'SUCCEEDED') {
      return NextResponse.json({ ok: true });
    }

    const meta = yooObj.metadata as Record<string, string> | undefined;
    const planId = meta?.planId ?? '';
    const billingPeriod = (meta?.billingPeriod ?? 'MONTHLY') as BillingPeriod;

    try {
      await db.$transaction(async (tx) => {
        // Обновить платёж: пишем paidAt и capturedAt — оба поля присутствуют в схеме
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCEEDED',
            paidAt: new Date(),
            capturedAt: new Date(),
          },
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
          // Привязать платёж к созданной подписке
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

        // Реферальные бонусы
        if (payment.referralId) {
          const freshPayment = { ...payment, status: 'SUCCEEDED' as const, paidAt: new Date() };
          await processReferralReward(tx, freshPayment);
        }

        // TODO: создать SubscriptionEvent(RENEWED/CREATED) — после добавления subscription-service.ts
        // TODO: upsert PaymentMethod если yooObj.payment_method?.saved === true
        // TODO: создать Receipt запись для ФЗ-54 аудита
      });

      logger.info({ paymentId: payment.id }, 'Webhook: подписка активирована');
    } catch (err) {
      logger.error({ err, paymentId: payment.id }, 'Webhook: ошибка активации подписки');
      return new NextResponse(null, { status: 500 });
    }
  }

  // ─── payment.canceled ────────────────────────────────────────────────────

  if (event === 'payment.canceled') {
    // Исправление: CANCELLED (пользователь отменил / таймаут), а не FAILED (ошибка карты)
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'CANCELLED', failedAt: new Date() },
    });
  }

  // ─── payment.waiting_for_capture ─────────────────────────────────────────

  if (event === 'payment.waiting_for_capture') {
    // Не должно возникать — мы используем capture=true при создании платежа
    logger.warn({ paymentId: payment.id }, 'Webhook: payment.waiting_for_capture — неожиданно, используем capture=true');
  }

  // ─── refund.succeeded ────────────────────────────────────────────────────

  if (event === 'refund.succeeded') {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
