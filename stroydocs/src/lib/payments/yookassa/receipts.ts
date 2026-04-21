import type { YookassaReceiptData } from './types';

/**
 * Коды НДС по справочнику ЮKassa.
 * Для ИП на УСН без НДС: NO_VAT = 1.
 * Управляется через ENV YOOKASSA_VAT_CODE — менять без пересборки при смене режима.
 */
export enum VatCode {
  NO_VAT   = 1,  // Без НДС — ИП на УСН, льгота Минцифры (ст. 149 НК РФ)
  VAT_0    = 2,  // 0% — экспорт
  VAT_10   = 3,  // 10% — льготные товары
  VAT_20   = 4,  // 20% (до 2025)
  VAT_10_110 = 5, // 10/110 расчётная
  VAT_20_120 = 6, // 20/120 расчётная (до 2025)
  VAT_22   = 7,  // 22% (с 1 января 2026)
  VAT_22_122 = 8, // 22/122 расчётная (с 1 января 2026)
}

/** Признак способа расчёта (54-ФЗ) */
export enum PaymentMode {
  FULL_PREPAYMENT    = 'full_prepayment',
  PARTIAL_PREPAYMENT = 'partial_prepayment',
  ADVANCE            = 'advance',
  FULL_PAYMENT       = 'full_payment',  // полный расчёт — наш случай для подписок
  PARTIAL_PAYMENT    = 'partial_payment',
  CREDIT             = 'credit',
  CREDIT_PAYMENT     = 'credit_payment',
}

/** Признак предмета расчёта (54-ФЗ) */
export enum PaymentSubject {
  COMMODITY  = 'commodity',
  EXCISE     = 'excise',
  JOB        = 'job',
  SERVICE    = 'service',   // SaaS-подписки
  PAYMENT    = 'payment',
  COMPOSITE  = 'composite',
  ANOTHER    = 'another',
}

/**
 * Строит объект receipt для передачи в ЮKassa при создании платежа.
 *
 * Режим НДС берётся из ENV YOOKASSA_VAT_CODE (default: 1 — Без НДС для ИП на УСН).
 * При переходе на плательщика НДС — менять переменную без пересборки.
 *
 * Возвращает undefined если YOOKASSA_RECEIPTS_ENABLED=false —
 * вызывающий код должен проверить результат перед отправкой.
 */
export function buildSubscriptionReceipt(params: {
  email: string;
  phone?: string;
  customerInn?: string;
  customerName?: string;
  plan: { name: string; priceRub: number };  // priceRub в копейках
  billingPeriod: 'MONTHLY' | 'YEARLY';
}): YookassaReceiptData | undefined {
  if (process.env.YOOKASSA_RECEIPTS_ENABLED === 'false') {
    return undefined;
  }

  const vatCode = Number(process.env.YOOKASSA_VAT_CODE ?? '1') as VatCode;
  const periodLabel = params.billingPeriod === 'YEARLY' ? '1 год' : '1 мес';

  return {
    customer: {
      email: params.email,
      ...(params.phone ? { phone: params.phone } : {}),
      ...(params.customerInn ? { inn: params.customerInn } : {}),
      ...(params.customerName ? { full_name: params.customerName } : {}),
    },
    items: [
      {
        description: `${params.plan.name}, подписка на ${periodLabel}`,
        quantity: '1.00',
        amount: {
          value: (params.plan.priceRub / 100).toFixed(2),
          currency: 'RUB',
        },
        vat_code: vatCode,
        payment_mode: PaymentMode.FULL_PAYMENT,
        payment_subject: PaymentSubject.SERVICE,
      },
    ],
  };
}
