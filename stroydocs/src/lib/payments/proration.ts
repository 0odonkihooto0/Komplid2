const DAYS_IN_PERIOD: Record<'MONTHLY' | 'YEARLY', number> = {
  MONTHLY: 30,
  YEARLY: 365,
};

export interface ProrationResult {
  proratedAmountRub: number;  // итоговая доплата (newPlanCostRub - unusedCreditRub), минимум 0
  unusedCreditRub: number;    // кредит за неиспользованное время старого плана
  newPlanCostRub: number;     // стоимость нового плана за оставшееся время
  daysRemaining: number;
  totalDays: number;
}

/**
 * Вычисляет доплату при апгрейде тарифа в середине периода.
 * Возвращает разбивку по составляющим для отображения в превью.
 */
export function calculateProration(params: {
  currentPeriodEnd: Date;
  oldPriceRub: number;
  newPriceRub: number;
  billingPeriod: 'MONTHLY' | 'YEARLY';
}): ProrationResult {
  const { currentPeriodEnd, oldPriceRub, newPriceRub, billingPeriod } = params;
  const totalDays = DAYS_IN_PERIOD[billingPeriod];

  const msRemaining = currentPeriodEnd.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / 86_400_000));
  const ratio = daysRemaining / totalDays;

  const unusedCreditRub = Math.floor(oldPriceRub * ratio);
  const newPlanCostRub = Math.ceil(newPriceRub * ratio);
  const proratedAmountRub = Math.max(0, newPlanCostRub - unusedCreditRub);

  return { proratedAmountRub, unusedCreditRub, newPlanCostRub, daysRemaining, totalDays };
}
