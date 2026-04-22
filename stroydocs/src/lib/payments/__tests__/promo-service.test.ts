import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateAndApplyPromoCode } from '../promo-service';

// ─── Мок Prisma-клиента ────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  db: {
    promoCode: { findUnique: vi.fn() },
    promoCodeRedemption: { count: vi.fn() },
    payment: { findFirst: vi.fn() },
  },
}));

import { db } from '@/lib/db';

// ─── Фабрики тестовых данных ──────────────────────────────────────────────────

const NOW = new Date('2026-01-15T12:00:00.000Z');

function makePromo(overrides: Record<string, unknown> = {}) {
  return {
    id: 'promo-1',
    code: 'TEST10',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscountRub: null,
    maxPerUser: 1,
    maxTotalRedemptions: null,
    redemptionsCount: 0,
    isFirstPaymentOnly: false,
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    validUntil: null,
    applicableToPlans: [],
    applicableToCategories: [],
    ...overrides,
  };
}

const BASE_PARAMS = {
  code: 'TEST10',
  workspaceId: 'ws-1',
  planId: 'plan-basic',
  planCategory: 'B2C' as const,
  originalAmountRub: 100_000,
};

describe('validateAndApplyPromoCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    // Дефолты
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(makePromo() as never);
    vi.mocked(db.promoCodeRedemption.count).mockResolvedValue(0);
    vi.mocked(db.payment.findFirst).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Типы скидок ─────────────────────────────────────────────────────────────

  it('PERCENT: скидка 10% без cap → Math.round(100000 * 10/100) = 10000', async () => {
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result).not.toBeNull();
    expect(result!.discountRub).toBe(10_000);
  });

  it('PERCENT: скидка 50% с maxDiscountRub=3000 → cap ограничивает скидку', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ discountType: 'PERCENT', discountValue: 50, maxDiscountRub: 3_000 }) as never,
    );
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    // raw = round(100000 * 50/100) = 50000 → cap = 3000
    expect(result!.discountRub).toBe(3_000);
  });

  it('FIXED_AMOUNT: скидка 5000 при оплате 100000 → discountRub = 5000', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ discountType: 'FIXED_AMOUNT', discountValue: 5_000 }) as never,
    );
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result!.discountRub).toBe(5_000);
  });

  it('FIXED_AMOUNT: скидка 200000 при оплате 100000 → ограничивается до 100000', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ discountType: 'FIXED_AMOUNT', discountValue: 200_000 }) as never,
    );
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result!.discountRub).toBe(100_000);
  });

  it('TRIAL_DAYS → discountRub = 0 (обрабатывается снаружи)', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ discountType: 'TRIAL_DAYS', discountValue: 14 }) as never,
    );
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result).not.toBeNull();
    expect(result!.discountRub).toBe(0);
  });

  it('FREE_MONTHS → discountRub = 0 (обрабатывается снаружи)', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ discountType: 'FREE_MONTHS', discountValue: 1 }) as never,
    );
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result).not.toBeNull();
    expect(result!.discountRub).toBe(0);
  });

  // ── Негативные случаи (код не применим) ─────────────────────────────────────

  it('код не найден → возвращает null', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(null);
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result).toBeNull();
  });

  it('validFrom в будущем → возвращает null', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ validFrom: new Date('2026-02-01T00:00:00.000Z') }) as never,
    );
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result).toBeNull();
  });

  it('validUntil в прошлом → возвращает null', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ validUntil: new Date('2025-12-31T23:59:59.000Z') }) as never,
    );
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result).toBeNull();
  });

  it('maxTotalRedemptions исчерпан → возвращает null', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ maxTotalRedemptions: 100, redemptionsCount: 100 }) as never,
    );
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result).toBeNull();
  });

  it('maxPerUser исчерпан для данного workspaceId → возвращает null', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ maxPerUser: 1 }) as never,
    );
    vi.mocked(db.promoCodeRedemption.count).mockResolvedValue(1);
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result).toBeNull();
  });

  it('isFirstPaymentOnly=true, у workspace уже есть SUCCEEDED платёж → возвращает null', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ isFirstPaymentOnly: true }) as never,
    );
    vi.mocked(db.payment.findFirst).mockResolvedValue({ id: 'pay-prev' } as never);
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result).toBeNull();
  });

  it('isFirstPaymentOnly=true, нет предыдущих платежей → применяется', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ isFirstPaymentOnly: true }) as never,
    );
    vi.mocked(db.payment.findFirst).mockResolvedValue(null);
    const result = await validateAndApplyPromoCode(BASE_PARAMS);
    expect(result).not.toBeNull();
    expect(result!.discountRub).toBe(10_000);
  });

  it('applicableToPlans непуст, планId не в списке → возвращает null', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({
        applicableToPlans: [{ planId: 'plan-pro' }, { planId: 'plan-team' }],
      }) as never,
    );
    const result = await validateAndApplyPromoCode({ ...BASE_PARAMS, planId: 'plan-basic' });
    expect(result).toBeNull();
  });

  it('applicableToPlans непуст, планId совпадает → применяется', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({
        applicableToPlans: [{ planId: 'plan-basic' }],
      }) as never,
    );
    const result = await validateAndApplyPromoCode({ ...BASE_PARAMS, planId: 'plan-basic' });
    expect(result).not.toBeNull();
  });

  it('applicableToCategories непуст, категория плана не в списке → возвращает null', async () => {
    vi.mocked(db.promoCode.findUnique).mockResolvedValue(
      makePromo({ applicableToCategories: ['B2B', 'ENTERPRISE'] }) as never,
    );
    const result = await validateAndApplyPromoCode({ ...BASE_PARAMS, planCategory: 'B2C' });
    expect(result).toBeNull();
  });
});
