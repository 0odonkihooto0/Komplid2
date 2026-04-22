/**
 * Integration-тесты подписочного flow.
 *
 * Используют stateful-мок БД: состояние хранится в переменных теста,
 * каждый db.* вызов читает/пишет их — без реальной БД, но проверяет
 * полный маршрут через сервисный слой.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Stateful-мок @/lib/db ────────────────────────────────────────────────────

let DB: {
  workspaces: Record<string, Record<string, unknown>>;
  plans: Record<string, Record<string, unknown>>;
  subscriptions: Record<string, Record<string, unknown>>;
  payments: Record<string, Record<string, unknown>>;
  paymentMethods: Record<string, Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  dunningAttempts: Array<Record<string, unknown>>;
};

function resetDB() {
  DB = {
    workspaces: {},
    plans: {},
    subscriptions: {},
    payments: {},
    paymentMethods: {},
    events: [],
    dunningAttempts: [],
  };
}

vi.mock('@/lib/db', () => {
  function makeTxOps() {
    return {
      payment: {
        findUnique: vi.fn((q: { where: { id: string } }) => Promise.resolve(DB.payments[q.where.id] ?? null)),
        create: vi.fn((q: { data: Record<string, unknown> }) => {
          const id = String(Object.keys(DB.payments).length + 1);
          const row = { id, ...q.data };
          DB.payments[id] = row;
          return Promise.resolve(row);
        }),
        update: vi.fn((q: { where: { id: string }; data: Record<string, unknown> }) => {
          DB.payments[q.where.id] = { ...DB.payments[q.where.id], ...q.data };
          return Promise.resolve(DB.payments[q.where.id]);
        }),
        findFirst: vi.fn(() => Promise.resolve(null)),
      },
      subscription: {
        findUnique: vi.fn((q: { where: { id: string } }) => Promise.resolve(DB.subscriptions[q.where.id] ?? null)),
        findMany: vi.fn(() => Promise.resolve([])),
        create: vi.fn((q: { data: Record<string, unknown> }) => {
          const id = `sub-${Date.now()}`;
          const row = { id, ...q.data };
          DB.subscriptions[id] = row;
          return Promise.resolve(row);
        }),
        update: vi.fn((q: { where: { id: string }; data: Record<string, unknown> }) => {
          DB.subscriptions[q.where.id] = { ...DB.subscriptions[q.where.id], ...q.data };
          return Promise.resolve(DB.subscriptions[q.where.id]);
        }),
      },
      workspace: {
        findUnique: vi.fn((q: { where: { id: string }; select?: unknown }) =>
          Promise.resolve(DB.workspaces[q.where.id] ?? null),
        ),
        findMany: vi.fn(() => Promise.resolve(Object.values(DB.workspaces))),
        update: vi.fn((q: { where: { id: string }; data: Record<string, unknown> }) => {
          DB.workspaces[q.where.id] = { ...DB.workspaces[q.where.id], ...q.data };
          return Promise.resolve(DB.workspaces[q.where.id]);
        }),
      },
      subscriptionPlan: {
        findUnique: vi.fn((q: { where: { code?: string; id?: string } }) => {
          const plan = Object.values(DB.plans).find(
            (p) => p.code === q.where.code || p.id === q.where.id,
          );
          return Promise.resolve(plan ?? null);
        }),
      },
      workspaceCredit: {
        findUnique: vi.fn(() => Promise.resolve(null)),
        update: vi.fn(),
      },
      creditLedgerEntry: { create: vi.fn() },
      promoCodeRedemption: { create: vi.fn() },
      promoCode: { update: vi.fn() },
      subscriptionEvent: {
        create: vi.fn((q: { data: Record<string, unknown> }) => {
          DB.events.push(q.data);
          return Promise.resolve(q.data);
        }),
      },
      dunningAttempt: {
        create: vi.fn((q: { data: Record<string, unknown> }) => {
          const row = { id: `da-${DB.dunningAttempts.length + 1}`, ...q.data };
          DB.dunningAttempts.push(row);
          return Promise.resolve(row);
        }),
        update: vi.fn((q: { where: { id: string }; data: Record<string, unknown> }) => {
          const attempt = DB.dunningAttempts.find((a) => a.id === q.where.id);
          if (attempt) Object.assign(attempt, q.data);
          return Promise.resolve(attempt ?? q.data);
        }),
      },
      notification: { create: vi.fn() },
      user: {
        findUnique: vi.fn((q: { where: { id: string } }) =>
          Promise.resolve({
            id: q.where.id,
            email: 'owner@example.com',
            phone: null,
            firstName: 'Иван',
            lastName: 'Тестов',
          }),
        ),
      },
      paymentMethod: {
        findFirst: vi.fn((q: { where: { id?: string; workspaceId?: string } }) => {
          const methods = Object.values(DB.paymentMethods);
          if (q.where.id) return Promise.resolve(methods.find((m) => m.id === q.where.id) ?? null);
          return Promise.resolve(methods.find((m) => m.workspaceId === q.where.workspaceId && m.isActive && m.isDefault) ?? null);
        }),
      },
    };
  }

  const ops = makeTxOps();
  const db = {
    ...ops,
    $transaction: vi.fn(async (cbOrOps: unknown) =>
      Array.isArray(cbOrOps)
        ? Promise.all(cbOrOps)
        : (cbOrOps as (tx: typeof ops) => Promise<unknown>)(ops),
    ),
  };

  return { db };
});

vi.mock('../yookassa/payments', () => ({
  createPayment: vi.fn(),
  chargeRecurring: vi.fn(),
}));

vi.mock('../yookassa/receipts', () => ({
  buildSubscriptionReceipt: vi.fn().mockReturnValue({ items: [] }),
}));

vi.mock('../promo-service', () => ({
  validateAndApplyPromoCode: vi.fn().mockResolvedValue(null),
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
import {
  startSubscription,
  handleSuccessfulPayment,
  cancelSubscription,
  reactivateSubscription,
  upgradeSubscription,
  scheduleDowngrade,
} from '../subscription-service';
import {
  startDunning,
  attemptDunningCharge,
  transitionToGrace,
  transitionToExpired,
} from '../dunning-service';
import {
  processExpiredSubscriptions,
  processExpiredGracePeriods,
} from '@/lib/subscriptions/lifecycle';

// ─── Seed-данные ──────────────────────────────────────────────────────────────

const PLAN_BASIC = {
  id: 'plan-basic',
  code: 'BASIC',
  name: 'Базовый',
  category: 'B2C',
  isActive: true,
  priceMonthlyRub: 100_000,
  priceYearlyRub: 1_000_000,
};

const PLAN_PRO = {
  id: 'plan-pro',
  code: 'PRO',
  name: 'Про',
  category: 'B2C',
  isActive: true,
  priceMonthlyRub: 200_000,
  priceYearlyRub: 2_000_000,
};

const PLAN_FREE = {
  id: 'plan-free',
  code: 'FREE',
  name: 'Бесплатный',
  category: 'FREEMIUM',
  isActive: true,
  priceMonthlyRub: 0,
  priceYearlyRub: 0,
};

beforeEach(() => {
  resetDB();
  vi.clearAllMocks();

  // Seed планы
  DB.plans['plan-basic'] = PLAN_BASIC;
  DB.plans['plan-pro'] = PLAN_PRO;
  DB.plans['plan-free'] = PLAN_FREE;

  // Seed workspace
  DB.workspaces['ws-1'] = {
    id: 'ws-1',
    ownerId: 'user-1',
    activeSubscriptionId: null,
  };
});

// ─── Сценарий 1: Полный цикл платёж → активация → истечение → dunning ─────────

describe('Сценарий 1: startSubscription → payment.succeeded → PAST_DUE → dunning resolved', () => {
  it('flow: создание платежа, активация, dunning-успех', async () => {
    // Шаг 1: пользователь инициирует подписку
    vi.mocked(createPayment).mockResolvedValue({
      id: 'yoo-1',
      status: 'pending',
      confirmation: { confirmation_token: 'tok-1' },
    } as never);

    const startResult = await startSubscription({
      workspaceId: 'ws-1',
      userId: 'user-1',
      planCode: 'BASIC',
      billingPeriod: 'MONTHLY',
      returnUrl: 'https://app.test/return',
    });
    expect(startResult.confirmationToken).toBe('tok-1');
    const paymentId = startResult.paymentId;
    expect(DB.payments[paymentId]).toBeDefined();
    expect(DB.payments[paymentId].status).toBe('PENDING');

    // Шаг 2: webhook payment.succeeded → активация подписки
    // Обновляем payment с planId в metadata для handleSuccessfulPayment
    DB.payments[paymentId] = {
      ...DB.payments[paymentId],
      status: 'PENDING',
      subscriptionId: null,
      referralId: null,
    };

    await handleSuccessfulPayment({
      paymentDbId: paymentId,
      yooPaymentId: 'yoo-1',
      yooMetadata: { planId: 'plan-basic', billingPeriod: 'MONTHLY', workspaceId: 'ws-1' },
    });

    // Подписка создана и активна
    const subId = DB.workspaces['ws-1'].activeSubscriptionId as string;
    expect(subId).toBeTruthy();
    expect(DB.subscriptions[subId].status).toBe('ACTIVE');
    expect(DB.subscriptions[subId].planId).toBe('plan-basic');

    // Шаг 3: период истёк → PAST_DUE
    DB.subscriptions[subId] = {
      ...DB.subscriptions[subId],
      currentPeriodEnd: new Date(Date.now() - 86_400_000), // вчера
      workspace: { ownerId: 'user-1' },
    };
    vi.mocked(db.subscription.findMany).mockResolvedValue(
      [{ id: subId, workspaceId: 'ws-1', workspace: { ownerId: 'user-1' } }] as never,
    );

    const expiredCount = await processExpiredSubscriptions();
    expect(expiredCount).toBe(1);
    expect(DB.subscriptions[subId].status).toBe('PAST_DUE');

    // Шаг 4: dunning — карта есть, списание успешно
    DB.paymentMethods['pm-1'] = {
      id: 'pm-1',
      workspaceId: 'ws-1',
      providerMethodId: 'pm-yoo-1',
      isActive: true,
      isDefault: true,
    };
    DB.subscriptions[subId] = {
      ...DB.subscriptions[subId],
      plan: PLAN_BASIC,
      billingPeriod: 'MONTHLY',
      defaultPaymentMethodId: 'pm-1',
      defaultPaymentMethod: DB.paymentMethods['pm-1'],
    };

    vi.mocked(chargeRecurring).mockResolvedValue({ id: 'yoo-dunning-1', status: 'succeeded' } as never);

    await startDunning(subId);

    expect(DB.subscriptions[subId].status).toBe('ACTIVE');
    expect(DB.subscriptions[subId].dunningAttempts).toBe(0);
  });
});

// ─── Сценарий 2: Dunning полный цикл → grace → expired ────────────────────────

describe('Сценарий 2: PAST_DUE → 5 неудачных попыток → GRACE → EXPIRED', () => {
  it('flow: все dunning-попытки неудачны → GRACE → EXPIRED', async () => {
    const subId = 'sub-dunning';
    const periodEnd = new Date(Date.now() - 86_400_000);

    DB.subscriptions[subId] = {
      id: subId,
      workspaceId: 'ws-1',
      planId: 'plan-basic',
      plan: { id: 'plan-basic', name: 'Базовый', priceMonthlyRub: 100_000 },
      billingPeriod: 'MONTHLY',
      status: 'PAST_DUE',
      currentPeriodEnd: periodEnd,
      defaultPaymentMethodId: 'pm-1',
      defaultPaymentMethod: {
        id: 'pm-1',
        providerMethodId: 'pm-yoo-1',
        isActive: true,
      },
      workspace: { ownerId: 'user-1', id: 'ws-1' },
      dunningAttempts: 0,
    };
    DB.workspaces['ws-1'].activeSubscriptionId = subId;

    // 5 попыток — все неудачные
    vi.mocked(chargeRecurring).mockRejectedValue(new Error('Отказ банка'));

    for (let attempt = 1; attempt <= 5; attempt++) {
      await attemptDunningCharge(subId, attempt);
    }

    // После 5-й попытки → GRACE
    expect(DB.subscriptions[subId].status).toBe('GRACE');
    expect(DB.subscriptions[subId].graceUntil).toBeDefined();
    expect(DB.dunningAttempts.length).toBe(5);
    const allFailed = DB.dunningAttempts.every((a) => a.result === 'FAILED');
    expect(allFailed).toBe(true);

    // Симулируем истечение grace-периода
    DB.subscriptions[subId].graceUntil = new Date(Date.now() - 1000);
    vi.mocked(db.subscription.findMany)
      .mockResolvedValueOnce([]) // pastDueFallback
      .mockResolvedValueOnce([{ id: subId }] as never); // graceExpired

    const expiredCount = await processExpiredGracePeriods();
    expect(expiredCount).toBe(1);
    expect(DB.subscriptions[subId].status).toBe('EXPIRED');

    // Events: GRACE_STARTED + EXPIRED
    const eventTypes = DB.events.map((e) => e.type);
    expect(eventTypes).toContain('GRACE_STARTED');
    expect(eventTypes).toContain('EXPIRED');
  });
});

// ─── Сценарий 3: Upgrade с proration ─────────────────────────────────────────

describe('Сценарий 3: upgradeSubscription с proration и сохранённой картой', () => {
  it('flow: proratedAmount > 0, charged сразу через сохранённую карту', async () => {
    const periodEnd = new Date(Date.now() + 15 * 86_400_000); // 15 дней до конца
    const subId = 'sub-upg';

    DB.subscriptions[subId] = {
      id: subId,
      workspaceId: 'ws-1',
      planId: 'plan-basic',
      plan: PLAN_BASIC,
      billingPeriod: 'MONTHLY',
      status: 'ACTIVE',
      currentPeriodStart: new Date(Date.now() - 15 * 86_400_000),
      currentPeriodEnd: periodEnd,
      defaultPaymentMethodId: 'pm-upg',
      workspace: { ownerId: 'user-1', id: 'ws-1' },
      pendingPlanId: null,
    };
    DB.workspaces['ws-1'].activeSubscriptionId = subId;
    DB.paymentMethods['pm-upg'] = {
      id: 'pm-upg',
      providerMethodId: 'yoo-pm-upg',
      isActive: true,
      isDefault: true,
      workspaceId: 'ws-1',
    };

    vi.mocked(chargeRecurring).mockResolvedValue({ id: 'yoo-upg-chg', status: 'pending' } as never);

    const result = await upgradeSubscription({
      workspaceId: 'ws-1',
      userId: 'user-1',
      newPlanCode: 'PRO',
      billingPeriod: 'MONTHLY',
      returnUrl: 'https://app.test/return',
    });

    expect(result.path).toBe('charged');
    // proratedAmount = (PRO - BASIC) * 15/30 = (200000 - 100000) * 0.5 = 50000 (примерно)
    expect(result.amountRub).toBeGreaterThan(0);

    // payment создан как PLAN_UPGRADE
    const upgradePayment = Object.values(DB.payments).find((p) => p.type === 'PLAN_UPGRADE');
    expect(upgradePayment).toBeDefined();

    // chargeRecurring вызван один раз
    expect(chargeRecurring).toHaveBeenCalledOnce();
  });
});

// ─── Сценарий 4: Downgrade запланирован ──────────────────────────────────────

describe('Сценарий 4: scheduleDowngrade → pendingPlanId установлен', () => {
  it('flow: scheduleDowngrade создаёт event PLAN_CHANGE_SCHEDULED', async () => {
    const subId = 'sub-dg';
    DB.subscriptions[subId] = {
      id: subId,
      workspaceId: 'ws-1',
      planId: 'plan-basic',
      plan: PLAN_BASIC,
      billingPeriod: 'MONTHLY',
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 10 * 86_400_000),
      workspace: { ownerId: 'user-1' },
    };
    DB.workspaces['ws-1'].activeSubscriptionId = subId;

    await scheduleDowngrade({
      workspaceId: 'ws-1',
      userId: 'user-1',
      newPlanCode: 'FREE',
      billingPeriod: 'MONTHLY',
    });

    // pendingPlanId установлен
    expect(DB.subscriptions[subId].pendingPlanId).toBe('plan-free');

    // Событие создано
    const event = DB.events.find((e) => e.type === 'PLAN_CHANGE_SCHEDULED');
    expect(event).toBeDefined();
    expect((event!.payload as Record<string, string>).toPlanCode).toBe('FREE');
  });
});

// ─── Сценарий 5: Cancel → Reactivate ─────────────────────────────────────────

describe('Сценарий 5: cancelSubscription → reactivateSubscription', () => {
  it('flow: отмена ставит CANCELLED, реактивация возвращает ACTIVE', async () => {
    const subId = 'sub-cr';
    DB.subscriptions[subId] = {
      id: subId,
      workspaceId: 'ws-1',
      planId: 'plan-basic',
      plan: PLAN_BASIC,
      billingPeriod: 'MONTHLY',
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(Date.now() + 10 * 86_400_000),
      workspace: { ownerId: 'user-1' },
    };
    DB.workspaces['ws-1'].activeSubscriptionId = subId;

    // Отмена
    await cancelSubscription({ workspaceId: 'ws-1', userId: 'user-1', reason: 'TOO_EXPENSIVE' });

    expect(DB.subscriptions[subId].status).toBe('CANCELLED');
    expect(DB.subscriptions[subId].cancelAtPeriodEnd).toBe(true);
    const cancelEvent = DB.events.find((e) => e.type === 'CANCELLED');
    expect(cancelEvent).toBeDefined();

    // Реактивация
    await reactivateSubscription({ workspaceId: 'ws-1', userId: 'user-1' });

    expect(DB.subscriptions[subId].status).toBe('ACTIVE');
    expect(DB.subscriptions[subId].cancelAtPeriodEnd).toBe(false);
    const reactEvent = DB.events.find((e) => e.type === 'REACTIVATED');
    expect(reactEvent).toBeDefined();
  });
});
