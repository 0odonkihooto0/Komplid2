import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateProration } from '../proration';

// Фиксируем "сейчас" = 1 января 2026, 00:00:00 UTC
const NOW = new Date('2026-01-01T00:00:00.000Z').getTime();

const MS_PER_DAY = 86_400_000;

describe('calculateProration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── MONTHLY ─────────────────────────────────────────────────────────────────

  it('MONTHLY: 15 дней осталось из 30 → корректный proratedAmountRub', () => {
    const periodEnd = new Date(NOW + 15 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 100_000, // 1000 ₽
      newPriceRub: 200_000, // 2000 ₽
      billingPeriod: 'MONTHLY',
    });

    expect(result.totalDays).toBe(30);
    expect(result.daysRemaining).toBe(15);
    // unusedCredit = floor(100000 * 15/30) = floor(50000) = 50000
    expect(result.unusedCreditRub).toBe(50_000);
    // newPlanCost = ceil(200000 * 15/30) = ceil(100000) = 100000
    expect(result.newPlanCostRub).toBe(100_000);
    // prorated = 100000 - 50000 = 50000
    expect(result.proratedAmountRub).toBe(50_000);
  });

  it('MONTHLY totalDays = 30', () => {
    const periodEnd = new Date(NOW + 30 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 100_000,
      newPriceRub: 200_000,
      billingPeriod: 'MONTHLY',
    });
    expect(result.totalDays).toBe(30);
  });

  it('MONTHLY: 1 день остался из 30 → очень маленький кредит', () => {
    const periodEnd = new Date(NOW + 1 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 100_000,
      newPriceRub: 200_000,
      billingPeriod: 'MONTHLY',
    });
    expect(result.daysRemaining).toBe(1);
    // unusedCredit = floor(100000 * 1/30) = floor(3333.3) = 3333
    expect(result.unusedCreditRub).toBe(3_333);
    // newPlanCost = ceil(200000 * 1/30) = ceil(6666.6) = 6667
    expect(result.newPlanCostRub).toBe(6_667);
    expect(result.proratedAmountRub).toBe(6_667 - 3_333);
  });

  it('MONTHLY: 29 дней из 30 → почти полный кредит', () => {
    const periodEnd = new Date(NOW + 29 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 100_000,
      newPriceRub: 200_000,
      billingPeriod: 'MONTHLY',
    });
    expect(result.daysRemaining).toBe(29);
    // unusedCredit = floor(100000 * 29/30) = floor(96666.6) = 96666
    expect(result.unusedCreditRub).toBe(96_666);
    // newPlanCost = ceil(200000 * 29/30) = ceil(193333.3) = 193334
    expect(result.newPlanCostRub).toBe(193_334);
    expect(result.proratedAmountRub).toBe(193_334 - 96_666);
  });

  // ── YEARLY ──────────────────────────────────────────────────────────────────

  it('YEARLY totalDays = 365', () => {
    const periodEnd = new Date(NOW + 365 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 1_000_000,
      newPriceRub: 2_000_000,
      billingPeriod: 'YEARLY',
    });
    expect(result.totalDays).toBe(365);
  });

  it('YEARLY: 180 дней из 365 → корректная прорация', () => {
    const periodEnd = new Date(NOW + 180 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 1_000_000,
      newPriceRub: 2_000_000,
      billingPeriod: 'YEARLY',
    });
    expect(result.daysRemaining).toBe(180);
    const ratio = 180 / 365;
    expect(result.unusedCreditRub).toBe(Math.floor(1_000_000 * ratio));
    expect(result.newPlanCostRub).toBe(Math.ceil(2_000_000 * ratio));
  });

  // ── Граничные случаи ────────────────────────────────────────────────────────

  it('период уже истёк → daysRemaining=0, proratedAmountRub=0', () => {
    const periodEnd = new Date(NOW - 1 * MS_PER_DAY); // в прошлом
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 100_000,
      newPriceRub: 200_000,
      billingPeriod: 'MONTHLY',
    });
    expect(result.daysRemaining).toBe(0);
    expect(result.unusedCreditRub).toBe(0);
    expect(result.newPlanCostRub).toBe(0);
    expect(result.proratedAmountRub).toBe(0);
  });

  it('ровно в момент окончания периода → 0 дней', () => {
    const periodEnd = new Date(NOW); // прямо сейчас
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 100_000,
      newPriceRub: 200_000,
      billingPeriod: 'MONTHLY',
    });
    expect(result.daysRemaining).toBe(0);
    expect(result.proratedAmountRub).toBe(0);
  });

  it('новый план дешевле → proratedAmountRub = 0 (не отрицательный)', () => {
    const periodEnd = new Date(NOW + 15 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 200_000,
      newPriceRub: 100_000,
      billingPeriod: 'MONTHLY',
    });
    expect(result.proratedAmountRub).toBe(0);
    expect(result.unusedCreditRub).toBeGreaterThan(result.newPlanCostRub);
  });

  it('одинаковые цены → proratedAmountRub зависит от округления', () => {
    const periodEnd = new Date(NOW + 15 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 100_000,
      newPriceRub: 100_000,
      billingPeriod: 'MONTHLY',
    });
    // floor и ceil могут дать разницу 0 или 1 при точном делении
    expect(result.proratedAmountRub).toBeGreaterThanOrEqual(0);
    // При 15/30 = 0.5 нет дробной части → floor=ceil → 0
    expect(result.proratedAmountRub).toBe(0);
  });

  it('апгрейд с бесплатного плана (oldPriceRub=0)', () => {
    const periodEnd = new Date(NOW + 10 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 0,
      newPriceRub: 100_000,
      billingPeriod: 'MONTHLY',
    });
    expect(result.unusedCreditRub).toBe(0);
    // newPlanCost = ceil(100000 * 10/30) = ceil(33333.3) = 33334
    expect(result.newPlanCostRub).toBe(33_334);
    expect(result.proratedAmountRub).toBe(33_334);
  });

  it('новый план = 0 руб → proratedAmountRub = 0', () => {
    const periodEnd = new Date(NOW + 15 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 100_000,
      newPriceRub: 0,
      billingPeriod: 'MONTHLY',
    });
    expect(result.newPlanCostRub).toBe(0);
    expect(result.proratedAmountRub).toBe(0);
  });

  it('unusedCreditRub использует Math.floor (не round)', () => {
    // 100001 * 1/30 = 3333.366... → floor = 3333, round = 3333 → ok
    // Проверяем что точно floor: 100001 * 10/30 = 33333.666... → floor=33333, round=33334
    const periodEnd = new Date(NOW + 10 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 100_001,
      newPriceRub: 0,
      billingPeriod: 'MONTHLY',
    });
    const ratio = 10 / 30;
    expect(result.unusedCreditRub).toBe(Math.floor(100_001 * ratio));
  });

  it('newPlanCostRub использует Math.ceil (не round)', () => {
    // 100001 * 10/30 = 33333.666... → ceil=33334
    const periodEnd = new Date(NOW + 10 * MS_PER_DAY);
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      oldPriceRub: 0,
      newPriceRub: 100_001,
      billingPeriod: 'MONTHLY',
    });
    const ratio = 10 / 30;
    expect(result.newPlanCostRub).toBe(Math.ceil(100_001 * ratio));
  });
});
