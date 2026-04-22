import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildSubscriptionReceipt, VatCode, PaymentMode, PaymentSubject } from '../receipts';

const BASE_PLAN = { name: 'Стандарт', priceRub: 100_000 };

describe('buildSubscriptionReceipt', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('MONTHLY: возвращает корректный чек с email', () => {
    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      plan: BASE_PLAN,
      billingPeriod: 'MONTHLY',
    });

    expect(result).not.toBeUndefined();
    expect(result!.customer.email).toBe('user@example.com');
    expect(result!.items[0].description).toBe('Стандарт, подписка на 1 мес');
    expect(result!.items[0].amount.value).toBe('1000.00');
    expect(result!.items[0].amount.currency).toBe('RUB');
    expect(result!.items[0].quantity).toBe('1.00');
    expect(result!.items[0].payment_mode).toBe(PaymentMode.FULL_PAYMENT);
    expect(result!.items[0].payment_subject).toBe(PaymentSubject.SERVICE);
  });

  it('YEARLY: periodLabel = "1 год"', () => {
    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      plan: BASE_PLAN,
      billingPeriod: 'YEARLY',
    });

    expect(result).not.toBeUndefined();
    expect(result!.items[0].description).toBe('Стандарт, подписка на 1 год');
  });

  it('YOOKASSA_RECEIPTS_ENABLED=false → возвращает undefined', () => {
    vi.stubEnv('YOOKASSA_RECEIPTS_ENABLED', 'false');

    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      plan: BASE_PLAN,
      billingPeriod: 'MONTHLY',
    });

    expect(result).toBeUndefined();
  });

  it('YOOKASSA_RECEIPTS_ENABLED=true → возвращает объект', () => {
    vi.stubEnv('YOOKASSA_RECEIPTS_ENABLED', 'true');

    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      plan: BASE_PLAN,
      billingPeriod: 'MONTHLY',
    });

    expect(result).not.toBeUndefined();
  });

  it('YOOKASSA_VAT_CODE=4 → vat_code = VatCode.VAT_20', () => {
    vi.stubEnv('YOOKASSA_VAT_CODE', '4');

    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      plan: BASE_PLAN,
      billingPeriod: 'MONTHLY',
    });

    expect(result!.items[0].vat_code).toBe(VatCode.VAT_20);
    expect(result!.items[0].vat_code).toBe(4);
  });

  it('default vat_code = VatCode.NO_VAT (1) если YOOKASSA_VAT_CODE не задан', () => {
    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      plan: BASE_PLAN,
      billingPeriod: 'MONTHLY',
    });

    expect(result!.items[0].vat_code).toBe(VatCode.NO_VAT);
    expect(result!.items[0].vat_code).toBe(1);
  });

  it('phone: добавляется в customer если передан', () => {
    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      phone: '+79001234567',
      plan: BASE_PLAN,
      billingPeriod: 'MONTHLY',
    });

    expect(result!.customer.phone).toBe('+79001234567');
  });

  it('phone: НЕ включается в customer если не передан', () => {
    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      plan: BASE_PLAN,
      billingPeriod: 'MONTHLY',
    });

    expect(result!.customer).not.toHaveProperty('phone');
  });

  it('customerInn: добавляется как inn если передан', () => {
    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      customerInn: '7712345678',
      plan: BASE_PLAN,
      billingPeriod: 'MONTHLY',
    });

    expect(result!.customer.inn).toBe('7712345678');
  });

  it('customerName: добавляется как full_name если передан', () => {
    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      customerName: 'Иванов Иван Иванович',
      plan: BASE_PLAN,
      billingPeriod: 'MONTHLY',
    });

    expect(result!.customer.full_name).toBe('Иванов Иван Иванович');
  });

  it('priceRub в копейках → amount.value в рублях (деление на 100)', () => {
    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      plan: { name: 'Про', priceRub: 50_000 },
      billingPeriod: 'MONTHLY',
    });

    expect(result!.items[0].amount.value).toBe('500.00');
  });

  it('все опциональные поля: phone + customerInn + customerName вместе', () => {
    const result = buildSubscriptionReceipt({
      email: 'user@example.com',
      phone: '+79001234567',
      customerInn: '7712345678',
      customerName: 'Иванов Иван Иванович',
      plan: BASE_PLAN,
      billingPeriod: 'YEARLY',
    });

    expect(result!.customer.email).toBe('user@example.com');
    expect(result!.customer.phone).toBe('+79001234567');
    expect(result!.customer.inn).toBe('7712345678');
    expect(result!.customer.full_name).toBe('Иванов Иван Иванович');
  });
});
