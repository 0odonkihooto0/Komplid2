import { db } from '@/lib/db';
import type { DiscountType, PlanCategory, PromoCode } from '@prisma/client';

interface ValidateResult {
  promoCode: PromoCode;
  discountRub: number;
}

/**
 * Проверяет промокод и возвращает размер скидки в копейках.
 * Возвращает null если код не найден или не применим.
 * Для TRIAL_DAYS / FREE_MONTHS возвращает discountRub: 0 — обрабатывается снаружи.
 */
export async function validateAndApplyPromoCode(params: {
  code: string;
  workspaceId: string;
  planId: string;
  planCategory: PlanCategory | null;
  originalAmountRub: number;
}): Promise<ValidateResult | null> {
  const { code, workspaceId, planId, planCategory, originalAmountRub } = params;

  const promo = await db.promoCode.findUnique({
    where: { code },
    include: { applicableToPlans: true },
  });

  if (!promo) return null;

  const now = new Date();

  // Период действия
  if (now < promo.validFrom) return null;
  if (promo.validUntil && now > promo.validUntil) return null;

  // Лимит на общее число применений
  if (promo.maxTotalRedemptions !== null && promo.redemptionsCount >= promo.maxTotalRedemptions) {
    return null;
  }

  // Лимит на одного пользователя
  const userRedemptions = await db.promoCodeRedemption.count({
    where: { promoCodeId: promo.id, workspaceId },
  });
  if (userRedemptions >= promo.maxPerUser) return null;

  // Только для первого платежа
  if (promo.isFirstPaymentOnly) {
    const prevPayment = await db.payment.findFirst({
      where: { workspaceId, status: 'SUCCEEDED' },
      select: { id: true },
    });
    if (prevPayment) return null;
  }

  // Ограничение по конкретным планам
  if (promo.applicableToPlans.length > 0) {
    const allowed = promo.applicableToPlans.some((r) => r.planId === planId);
    if (!allowed) return null;
  }

  // Ограничение по категориям планов
  if (promo.applicableToCategories.length > 0 && planCategory) {
    if (!promo.applicableToCategories.includes(planCategory)) return null;
  }

  const discountRub = computeDiscount(promo.discountType, promo.discountValue, promo.maxDiscountRub, originalAmountRub);

  return { promoCode: promo, discountRub };
}

function computeDiscount(
  type: DiscountType,
  value: number,
  maxRub: number | null,
  originalAmountRub: number,
): number {
  if (type === 'PERCENT') {
    const raw = Math.round(originalAmountRub * value / 100);
    return maxRub !== null ? Math.min(raw, maxRub) : raw;
  }
  if (type === 'FIXED_AMOUNT') {
    return Math.min(value, originalAmountRub);
  }
  // TRIAL_DAYS / FREE_MONTHS — скидка не в деньгах, обрабатывается снаружи
  return 0;
}
