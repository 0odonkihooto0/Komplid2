import { getYookassaClient } from './client';
import type {
  YookassaPayment,
  YookassaPaymentAmount,
  YookassaPaymentCreateRequest,
  YookassaReceiptData,
} from './types';

interface CreatePaymentParams {
  amount: YookassaPaymentAmount;
  description: string;
  // workspaceId, subscriptionId, paymentDbId — для идентификации в webhook
  metadata: Record<string, string>;
  idempotenceKey: string;
  returnUrl: string;
  confirmation?: 'redirect' | 'embedded';
  savePaymentMethod?: boolean;
  // Передать для автосписания с сохранённого способа (рекуррент)
  paymentMethodId?: string;
  capture?: boolean;
  receipt?: YookassaReceiptData;
}

/** Создаёт платёж в ЮKassa. При paymentMethodId — рекуррентное списание без редиректа. */
export async function createPayment(params: CreatePaymentParams): Promise<YookassaPayment> {
  const client = getYookassaClient();

  const body: YookassaPaymentCreateRequest = {
    amount: params.amount,
    description: params.description,
    metadata: params.metadata,
    capture: params.capture ?? true,
  };

  if (params.paymentMethodId) {
    // Рекуррентный платёж — confirmation не нужен
    body.payment_method_id = params.paymentMethodId;
  } else {
    body.confirmation = {
      type: params.confirmation === 'embedded' ? 'embedded' : 'redirect',
      return_url: params.returnUrl,
    };
  }

  if (params.savePaymentMethod) {
    body.save_payment_method = true;
  }

  if (params.receipt) {
    body.receipt = params.receipt;
  }

  return client.request<YookassaPayment>({
    method: 'POST',
    path: '/payments',
    body: body as unknown as Record<string, unknown>,
    idempotenceKey: params.idempotenceKey,
  });
}

/**
 * Автоплатёж по сохранённому методу (продление подписки / dunning).
 * Caller предоставляет idempotenceKey — обычно это providerIdempotenceKey из Payment в БД.
 */
export async function chargeRecurring(params: {
  paymentMethodId: string;
  amount: YookassaPaymentAmount;
  description: string;
  metadata: Record<string, string>;
  idempotenceKey: string;
  receipt?: YookassaReceiptData;
}): Promise<YookassaPayment> {
  const client = getYookassaClient();

  return client.request<YookassaPayment>({
    method: 'POST',
    path: '/payments',
    idempotenceKey: params.idempotenceKey,
    body: {
      amount: params.amount,
      payment_method_id: params.paymentMethodId,
      description: params.description,
      metadata: params.metadata,
      capture: true,
      ...(params.receipt ? { receipt: params.receipt } : {}),
    },
  });
}

/** Получить актуальное состояние платежа из ЮKassa */
export async function getPayment(paymentId: string): Promise<YookassaPayment> {
  const client = getYookassaClient();
  return client.request<YookassaPayment>({ method: 'GET', path: `/payments/${paymentId}` });
}

/** Захват средств при двухстадийной оплате (capture=false при создании) */
export async function capturePayment(
  paymentId: string,
  amount?: YookassaPaymentAmount,
): Promise<YookassaPayment> {
  const client = getYookassaClient();
  return client.request<YookassaPayment>({
    method: 'POST',
    path: `/payments/${paymentId}/capture`,
    body: amount ? { amount } : undefined,
  });
}

/** Отмена платежа (работает пока статус pending / waiting_for_capture) */
export async function cancelPayment(paymentId: string): Promise<YookassaPayment> {
  const client = getYookassaClient();
  return client.request<YookassaPayment>({
    method: 'POST',
    path: `/payments/${paymentId}/cancel`,
  });
}
