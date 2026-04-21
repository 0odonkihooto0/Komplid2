import { getYookassaClient } from './client';
import type { YookassaRefund, YookassaPaymentAmount, YookassaReceiptData } from './types';

/** Создаёт возврат через ЮKassa. Полный или частичный (передать нужную сумму). */
export async function createRefund(params: {
  paymentId: string;
  amount: YookassaPaymentAmount;
  description: string;
  idempotenceKey: string;
  receipt?: YookassaReceiptData;
}): Promise<YookassaRefund> {
  const client = getYookassaClient();
  return client.request<YookassaRefund>({
    method: 'POST',
    path: '/refunds',
    idempotenceKey: params.idempotenceKey,
    body: {
      payment_id: params.paymentId,
      amount: params.amount,
      description: params.description,
      ...(params.receipt ? { receipt: params.receipt } : {}),
    },
  });
}
