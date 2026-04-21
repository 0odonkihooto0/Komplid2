import type { ProfessionalRole } from '@prisma/client';

interface CalcInput {
  referrerRole: ProfessionalRole | null;
  referredRole: ProfessionalRole | null;
  firstPaymentAmountRub: number; // в копейках
}

export interface CalcOutput {
  isCrossRole: boolean;
  referrerCreditRub: number;  // начисление в кредит реферера (копейки)
  referredDiscountRub: number; // скидка приглашённому (копейки)
}

// Правила Фазы 1:
// Та же роль:   реферер 50% / приглашённый 30%
// Разная роль:  реферер 90% / приглашённый 40%
export function calculateReferralReward(input: CalcInput): CalcOutput {
  const isCrossRole =
    input.referrerRole !== null &&
    input.referredRole !== null &&
    input.referrerRole !== input.referredRole;

  const referrerPercent = isCrossRole ? 0.90 : 0.50;
  const referredPercent = isCrossRole ? 0.40 : 0.30;

  return {
    isCrossRole,
    referrerCreditRub: Math.floor(input.firstPaymentAmountRub * referrerPercent),
    referredDiscountRub: Math.floor(input.firstPaymentAmountRub * referredPercent),
  };
}
