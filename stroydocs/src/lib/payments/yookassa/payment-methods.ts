import { db } from '@/lib/db';
import { getYookassaClient } from './client';
import type { YookassaPaymentMethod } from './types';

/** Получить информацию о сохранённом способе оплаты из ЮKassa */
export async function getPaymentMethod(methodId: string): Promise<YookassaPaymentMethod> {
  const client = getYookassaClient();
  return client.request<YookassaPaymentMethod>({
    method: 'GET',
    path: `/payment_methods/${methodId}`,
  });
}

/**
 * Деактивирует сохранённый способ оплаты.
 *
 * ЮKassa не предоставляет API для удаления/деактивации payment_method —
 * деактивация выполняется только в нашей БД. После этого метод не будет
 * использоваться для автосписаний, но токен в ЮKassa остаётся.
 *
 * Если workspaceId не совпадает — деактивация не выполняется (защита от IDOR).
 */
export async function deactivatePaymentMethod(
  workspaceId: string,
  providerMethodId: string,
  reason: string,
): Promise<void> {
  await db.paymentMethod.updateMany({
    where: { workspaceId, providerMethodId, isActive: true },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
      deactivationReason: reason,
    },
  });
}
