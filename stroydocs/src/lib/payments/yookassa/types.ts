// Типы ответов ЮKassa API. Только типы — без импортов из проекта.

export interface YookassaPaymentAmount {
  value: string;    // "1900.00"
  currency: 'RUB';
}

// confirmation может быть redirect (возвращает URL) или embedded (виджет с токеном)
export type YookassaConfirmation =
  | { type: 'redirect'; return_url: string; confirmation_url?: string }
  | { type: 'embedded'; confirmation_token?: string; return_url?: string };

/** Сохранённый способ оплаты (возвращается при save_payment_method: true) */
export interface YookassaPaymentMethod {
  id: string;
  type: 'bank_card' | 'sbp' | 'yoo_money' | 'sberbank' | 'tinkoff_bank' | 'yandex_pay';
  saved: boolean;
  title?: string;
  card?: {
    card_type: string;      // VISA / MasterCard / MIR
    last4: string;
    expiry_month: string;
    expiry_year: string;
  };
  account_number?: string;  // для ЮMoney
}

/** Полный объект платежа из ЮKassa */
export interface YookassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: YookassaPaymentAmount;
  description?: string;
  confirmation?: YookassaConfirmation;
  payment_method?: YookassaPaymentMethod;
  captured_at?: string;     // ISO 8601
  created_at: string;
  metadata?: Record<string, string>;
  paid: boolean;
  refundable: boolean;
  test: boolean;
  income_amount?: YookassaPaymentAmount;
  receipt_registration?: 'pending' | 'succeeded' | 'canceled';
}

/** Объект возврата из ЮKassa */
export interface YookassaRefund {
  id: string;
  payment_id: string;
  status: 'pending' | 'succeeded' | 'canceled';
  amount: YookassaPaymentAmount;
  description?: string;
  created_at: string;
  receipt_registration?: 'pending' | 'succeeded' | 'canceled';
}

// ─── Чеки 54-ФЗ ────────────────────────────────────────────────────────────

export interface YookassaReceiptCustomer {
  email?: string;
  phone?: string;
  inn?: string;         // для юрлиц
  full_name?: string;
}

export interface YookassaReceiptItem {
  description: string;
  quantity: string;               // "1.00"
  amount: YookassaPaymentAmount;
  vat_code: number;               // 1=Без НДС, 7=22%, 8=22/122
  payment_mode: string;           // 'full_payment' и др.
  payment_subject: string;        // 'service' для подписок
}

export interface YookassaReceiptData {
  customer: YookassaReceiptCustomer;
  items: YookassaReceiptItem[];
}

// ─── Webhook ────────────────────────────────────────────────────────────────

export type YookassaEventType =
  | 'payment.succeeded'
  | 'payment.canceled'
  | 'payment.waiting_for_capture'
  | 'refund.succeeded';

export interface YookassaNotification {
  type: 'notification';
  event: YookassaEventType;
  object: YookassaPayment | YookassaRefund;
}

// ─── Internal request types ─────────────────────────────────────────────────

/** Тело запроса POST /payments */
export interface YookassaPaymentCreateRequest {
  amount: YookassaPaymentAmount;
  description?: string;
  metadata?: Record<string, string>;
  capture?: boolean;
  confirmation?: { type: 'redirect' | 'embedded'; return_url: string };
  payment_method_id?: string;    // для автосписания с сохранённого метода
  save_payment_method?: boolean;
  receipt?: YookassaReceiptData;
}
