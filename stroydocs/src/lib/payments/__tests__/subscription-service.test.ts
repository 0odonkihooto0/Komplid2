import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Моки модулей ──────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => {
  const txMock = {
    payment: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    subscription: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    workspace: { findUnique: vi.fn(), update: vi.fn() },
    subscriptionPlan: { findUnique: vi.fn() },
    workspaceCredit: { findUnique: vi.fn(), update: vi.fn() },
    creditLedgerEntry: { create: vi.fn() },
    promoCodeRedemption: { create: vi.fn() },
    promoCode: { update: vi.fn() },
    subscriptionEvent: { create: vi.fn() },
    notification: { create: vi.fn() },
    user: { findUnique: vi.fn() },
  };
  return {
    db: {
      ...txMock,
      paymentMethod: { findFirst: vi.fn() },
      // Поддерживаем и callback-форму и массив-форму $transaction
      $transaction: vi.fn(async (cbOrOps: unknown) =>
        Array.isArray(cbOrOps)
          ? Promise.all(cbOrOps)
          : (cbOrOps as (tx: typeof txMock) => Promise<unknown>)(txMock),
      ),
    },
  };
});

vi.mock('../yookassa/payments', () => ({
  createPayment: vi.fn(),
  chargeRecurring: vi.fn(),
}));

vi.mock('../yookassa/receipts', () => ({
  buildSubscriptionReceipt: vi.fn().mockReturnValue({ items: [] }),
}));

vi.mock('../promo-service', () => ({
  validateAndApplyPromoCode: vi.fn(),
}));

vi.mock('../dunning-service', () => ({
  applySuccessfulDunningPayment: vi.fn(),
}));

vi.mock('@/lib/queue', () => ({
  enqueueBillingEmail: vi.fn(),
  enqueueNotification: vi.fn(),
}));

vi.mock('@/lib/referrals/process-referral-payment', () => ({
  processReferralReward: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Импорты после моков ────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import { createPayment, chargeRecurring } from '../yookassa/payments';
import { validateAndApplyPromoCode } from '../promo-service';
import { applySuccessfulDunningPayment } from '../dunning-service';
import { enqueueBillingEmail } from '@/lib/queue';
import {
  startSubscription,
  upgradeSubscription,
  cancelSubscription,
  reactivateSubscription,
  scheduleDowngrade,
} from '../subscription-service';

// ─── Фабрики тестовых данных ──────────────────────────────────────────────────

function makePlan(overrides = {}) {
  return {
    id: 'plan-basic',
    code: 'BASIC',
    name: 'Базовый',
    category: 'B2C',
    isActive: true,
    priceMonthlyRub: 100_000,
    priceYearlyRub: 1_000_000,
    ...overrides,
  };
}

function makeSub(overrides = {}) {
  return {
    id: 'sub-1',
    workspaceId: 'ws-1',
    planId: 'plan-basic',
    plan: makePlan(),
    status: 'ACTIVE',
    billingPeriod: 'MONTHLY' as const,
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: new Date('2026-01-31'),
    cancelAtPeriodEnd: false,
    defaultPaymentMethodId: null,
    pendingPlanId: null,
    ...overrides,
  };
}

function makeUser(overrides = {}) {
  return { id: 'user-1', email: 'test@example.com', phone: null, firstName: 'Иван', lastName: 'Петров', ...overrides };
}

const BASE_START_PARAMS = {
  workspaceId: 'ws-1',
  userId: 'user-1',
  planCode: 'BASIC',
  billingPeriod: 'MONTHLY' as const,
  returnUrl: 'https://app.test/return',
};

describe('startSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(makePlan() as never);
    vi.mocked(db.workspaceCredit.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
    vi.mocked(db.payment.create).mockResolvedValue({ id: 'pay-1' } as never);
    vi.mocked(validateAndApplyPromoCode).mockResolvedValue(null);
    vi.mocked(createPayment).mockResolvedValue({
      id: 'yoo-pay-1',
      status: 'pending',
      confirmation: { confirmation_token: 'token-abc' },
    } as never);
  });

  it('успешный путь без промокода → возвращает confirmationToken и paymentId', async () => {
    const result = await startSubscription(BASE_START_PARAMS);

    expect(result.confirmationToken).toBe('token-abc');
    expect(result.paymentId).toBe('pay-1');
    expect(result.amountRub).toBe(100_000);
    expect(result.discountRub).toBe(0);
    expect(createPayment).toHaveBeenCalledOnce();
    expect(db.payment.create).toHaveBeenCalledOnce();
  });

  it('с промокодом PERCENT → discountRub вычтен, finalAmount уменьшен', async () => {
    vi.mocked(validateAndApplyPromoCode).mockResolvedValue({
      promoCode: { id: 'promo-1' } as never,
      discountRub: 10_000,
    });

    const result = await startSubscription({ ...BASE_START_PARAMS, promoCode: 'TEST10' });

    expect(result.discountRub).toBe(10_000);
    expect(result.amountRub).toBe(90_000);
    expect(result.originalAmountRub).toBe(100_000);
    // Фиксация промокода: promoCodeRedemption.create + promoCode.update вызваны
    expect(db.promoCodeRedemption.create).toHaveBeenCalledOnce();
    expect(db.promoCode.update).toHaveBeenCalledOnce();
  });

  it('с кредитами workspace → creditApplied применён, баланс декрементирован', async () => {
    vi.mocked(db.workspaceCredit.findUnique).mockResolvedValue({
      id: 'credit-1',
      balanceRub: 20_000,
    } as never);

    const result = await startSubscription(BASE_START_PARAMS);

    expect(result.amountRub).toBe(80_000); // 100000 - 20000 кредит
    expect(result.discountRub).toBe(20_000);
    // $transaction вызван для декремента баланса
    expect(db.$transaction).toHaveBeenCalled();
  });

  it('бесплатный план (priceMonthlyRub=0) → выбрасывает ошибку', async () => {
    vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(
      makePlan({ priceMonthlyRub: 0, priceYearlyRub: 0 }) as never,
    );

    await expect(startSubscription(BASE_START_PARAMS)).rejects.toThrow(
      'Бесплатный план не требует оплаты',
    );
  });

  it('пользователь не найден → выбрасывает ошибку', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    await expect(startSubscription(BASE_START_PARAMS)).rejects.toThrow('Пользователь не найден');
  });

  it('ЮKassa не вернула confirmation_token → выбрасывает ошибку', async () => {
    vi.mocked(createPayment).mockResolvedValue({
      id: 'yoo-2',
      status: 'pending',
      confirmation: {},
    } as never);

    await expect(startSubscription(BASE_START_PARAMS)).rejects.toThrow('confirmation_token');
  });
});

describe('upgradeSubscription', () => {
  const BASE_UPGRADE_PARAMS = {
    workspaceId: 'ws-1',
    userId: 'user-1',
    newPlanCode: 'PRO',
    billingPeriod: 'MONTHLY' as const,
    returnUrl: 'https://app.test/return',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
    vi.mocked(db.payment.create).mockResolvedValue({ id: 'pay-upg' } as never);
    vi.mocked(db.payment.update).mockResolvedValue({} as never);
    vi.mocked(db.subscription.update).mockResolvedValue({} as never);
    vi.mocked(db.subscriptionEvent.create).mockResolvedValue({} as never);
  });

  it('нет активной подписки → выбрасывает ошибку', async () => {
    // workspace.findUnique возвращает null → getActiveSubscription вернёт null
    vi.mocked(db.workspace.findUnique).mockResolvedValue(null as never);

    await expect(upgradeSubscription(BASE_UPGRADE_PARAMS)).rejects.toThrow('Активная подписка не найдена');
  });

  it('есть сохранённая карта, proratedAmount > 0 → путь charged, chargeRecurring вызван', async () => {
    const activeSub = makeSub({
      defaultPaymentMethodId: 'method-1',
      currentPeriodEnd: new Date(Date.now() + 15 * 86_400_000),
    });
    vi.mocked(db.workspace.findUnique).mockResolvedValue(
      { activeSubscriptionId: 'sub-1' } as never,
    );
    vi.mocked(db.subscription.findUnique).mockResolvedValue(activeSub as never);
    vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(
      makePlan({ id: 'plan-pro', code: 'PRO', priceMonthlyRub: 200_000 }) as never,
    );
    vi.mocked(db.paymentMethod.findFirst).mockResolvedValue({
      id: 'method-1',
      providerMethodId: 'pm-yoo-1',
      isActive: true,
    } as never);
    vi.mocked(chargeRecurring).mockResolvedValue({
      id: 'yoo-chg-1',
      status: 'pending',
    } as never);

    const result = await upgradeSubscription(BASE_UPGRADE_PARAMS);

    expect(result.path).toBe('charged');
    expect(chargeRecurring).toHaveBeenCalledOnce();
    expect(result.paymentId).toBe('pay-upg');
  });

  it('chargeRecurring вернул succeeded → applySuccessfulDunningPayment вызван', async () => {
    const activeSub = makeSub({
      defaultPaymentMethodId: 'method-1',
      currentPeriodEnd: new Date(Date.now() + 15 * 86_400_000),
    });
    vi.mocked(db.workspace.findUnique).mockResolvedValue({ activeSubscriptionId: 'sub-1' } as never);
    vi.mocked(db.subscription.findUnique).mockResolvedValue(activeSub as never);
    vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(
      makePlan({ id: 'plan-pro', code: 'PRO', priceMonthlyRub: 200_000 }) as never,
    );
    vi.mocked(db.paymentMethod.findFirst).mockResolvedValue({
      id: 'method-1',
      providerMethodId: 'pm-yoo-1',
      isActive: true,
    } as never);
    vi.mocked(chargeRecurring).mockResolvedValue({ id: 'yoo-chg-2', status: 'succeeded' } as never);

    await upgradeSubscription(BASE_UPGRADE_PARAMS);

    expect(applySuccessfulDunningPayment).toHaveBeenCalledWith('sub-1', 'pay-upg', 'MONTHLY');
    expect(db.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'UPGRADED' }) }),
    );
  });

  it('нет сохранённой карты → путь checkout, createPayment вызван', async () => {
    const activeSub = makeSub({ currentPeriodEnd: new Date(Date.now() + 15 * 86_400_000) });
    vi.mocked(db.workspace.findUnique).mockResolvedValue({ activeSubscriptionId: 'sub-1' } as never);
    vi.mocked(db.subscription.findUnique).mockResolvedValue(activeSub as never);
    vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(
      makePlan({ id: 'plan-pro', code: 'PRO', priceMonthlyRub: 200_000 }) as never,
    );
    vi.mocked(db.paymentMethod.findFirst).mockResolvedValue(null);
    vi.mocked(createPayment).mockResolvedValue({
      id: 'yoo-co-1',
      status: 'pending',
      confirmation: { confirmation_token: 'checkout-token' },
    } as never);

    const result = await upgradeSubscription(BASE_UPGRADE_PARAMS);

    expect(result.path).toBe('checkout');
    expect('confirmationToken' in result && result.confirmationToken).toBe('checkout-token');
    expect(createPayment).toHaveBeenCalledOnce();
  });
});

describe('cancelSubscription', () => {
  const BASE_CANCEL_PARAMS = {
    workspaceId: 'ws-1',
    userId: 'user-1',
    reason: 'TOO_EXPENSIVE' as const,
    feedback: 'дорого для стартапа',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.subscription.update).mockResolvedValue({} as never);
    vi.mocked(db.subscriptionEvent.create).mockResolvedValue({} as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
  });

  it('успешная отмена → status=CANCELLED, cancelAtPeriodEnd=true, event CANCELLED', async () => {
    vi.mocked(db.workspace.findUnique).mockResolvedValue({ activeSubscriptionId: 'sub-1' } as never);
    vi.mocked(db.subscription.findUnique).mockResolvedValue(makeSub() as never);

    await cancelSubscription(BASE_CANCEL_PARAMS);

    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED', cancelAtPeriodEnd: true }),
      }),
    );
    expect(db.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'CANCELLED' }) }),
    );
    expect(enqueueBillingEmail).toHaveBeenCalledOnce();
  });

  it('нет активной подписки → выбрасывает ошибку', async () => {
    vi.mocked(db.workspace.findUnique).mockResolvedValue(null as never);

    await expect(cancelSubscription(BASE_CANCEL_PARAMS)).rejects.toThrow('Активная подписка не найдена');
  });
});

describe('reactivateSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.subscription.update).mockResolvedValue({} as never);
    vi.mocked(db.subscriptionEvent.create).mockResolvedValue({} as never);
  });

  it('успешная реактивация → cancelAtPeriodEnd=false, status=ACTIVE, event REACTIVATED', async () => {
    vi.mocked(db.workspace.findUnique).mockResolvedValue({ activeSubscriptionId: 'sub-1' } as never);
    vi.mocked(db.subscription.findUnique).mockResolvedValue(
      makeSub({ cancelAtPeriodEnd: true, status: 'CANCELLED' }) as never,
    );

    await reactivateSubscription({ workspaceId: 'ws-1', userId: 'user-1' });

    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cancelAtPeriodEnd: false, status: 'ACTIVE' }),
      }),
    );
    expect(db.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'REACTIVATED' }) }),
    );
  });

  it('подписка не в статусе отмены → выбрасывает ошибку', async () => {
    vi.mocked(db.workspace.findUnique).mockResolvedValue({ activeSubscriptionId: 'sub-1' } as never);
    vi.mocked(db.subscription.findUnique).mockResolvedValue(
      makeSub({ cancelAtPeriodEnd: false }) as never,
    );

    await expect(reactivateSubscription({ workspaceId: 'ws-1', userId: 'user-1' }))
      .rejects.toThrow('не находится в статусе отмены');
  });

  it('нет активной подписки → выбрасывает ошибку', async () => {
    vi.mocked(db.workspace.findUnique).mockResolvedValue(null as never);

    await expect(reactivateSubscription({ workspaceId: 'ws-1', userId: 'user-1' }))
      .rejects.toThrow('Активная подписка не найдена');
  });
});

describe('scheduleDowngrade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.subscription.update).mockResolvedValue({} as never);
    vi.mocked(db.subscriptionEvent.create).mockResolvedValue({} as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
  });

  it('успешный downgrade → pendingPlanId установлен, event PLAN_CHANGE_SCHEDULED, email в очереди', async () => {
    vi.mocked(db.workspace.findUnique).mockResolvedValue({ activeSubscriptionId: 'sub-1' } as never);
    vi.mocked(db.subscription.findUnique).mockResolvedValue(makeSub() as never);
    vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(
      makePlan({ id: 'plan-free', code: 'FREE' }) as never,
    );

    await scheduleDowngrade({
      workspaceId: 'ws-1',
      userId: 'user-1',
      newPlanCode: 'FREE',
      billingPeriod: 'MONTHLY',
    });

    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pendingPlanId: 'plan-free' }),
      }),
    );
    expect(db.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'PLAN_CHANGE_SCHEDULED' }),
      }),
    );
    expect(enqueueBillingEmail).toHaveBeenCalledOnce();
  });
});
