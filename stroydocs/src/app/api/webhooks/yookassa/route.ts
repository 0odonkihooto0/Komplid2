export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isYookassaIp } from '@/lib/payments/yookassa/webhooks';
import {
  handleSuccessfulPayment,
  handleCancelledPayment,
  handleSuccessfulRefund,
} from '@/lib/payments/subscription-service';

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

  // 4. Поиск платежа — оба поля для обратной совместимости
  const payment = await db.payment.findFirst({
    where: {
      OR: [{ providerPaymentId: yooId }, { yookassaPaymentId: yooId }],
    },
  });

  if (!payment) {
    logger.warn({ yooId }, 'Webhook: платёж не найден в БД');
    return NextResponse.json({ ok: true });
  }

  // ─── payment.succeeded ───────────────────────────────────────────────────

  if (event === 'payment.succeeded') {
    try {
      const meta = (yooObj.metadata as Record<string, string> | undefined) ?? {};
      await handleSuccessfulPayment({
        paymentDbId: payment.id,
        yooPaymentId: yooId,
        yooMetadata: meta,
      });
    } catch (err) {
      logger.error({ err, paymentId: payment.id }, 'Webhook: ошибка активации подписки');
      return new NextResponse(null, { status: 500 });
    }
  }

  // ─── payment.canceled ────────────────────────────────────────────────────

  if (event === 'payment.canceled') {
    try {
      await handleCancelledPayment({ paymentDbId: payment.id });
    } catch (err) {
      logger.error({ err, paymentId: payment.id }, 'Webhook: ошибка отмены платежа');
      return new NextResponse(null, { status: 500 });
    }
  }

  // ─── payment.waiting_for_capture ─────────────────────────────────────────

  if (event === 'payment.waiting_for_capture') {
    logger.warn({ paymentId: payment.id }, 'Webhook: payment.waiting_for_capture — неожиданно, используем capture=true');
  }

  // ─── refund.succeeded ────────────────────────────────────────────────────

  if (event === 'refund.succeeded') {
    try {
      await handleSuccessfulRefund({ paymentDbId: payment.id });
    } catch (err) {
      logger.error({ err, paymentId: payment.id }, 'Webhook: ошибка обработки возврата');
      return new NextResponse(null, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
