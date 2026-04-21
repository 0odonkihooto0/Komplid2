const DAYS_IN_PERIOD: Record<'MONTHLY' | 'YEARLY', number> = {
  MONTHLY: 30,
  YEARLY: 365,
};

interface ProrationResult {
  proratedAmountRub: number;
  daysRemaining: number;
  totalDays: number;
}

/**
 * Вычисляет доплату при апгрейде тарифа в середине периода.
 * Возвращает разницу стоимостей, пропорциональную оставшемуся времени.
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

  const proratedAmountRub = Math.max(
    0,
    Math.round((newPriceRub - oldPriceRub) * daysRemaining / totalDays),
  );

  return { proratedAmountRub, daysRemaining, totalDays };
}
