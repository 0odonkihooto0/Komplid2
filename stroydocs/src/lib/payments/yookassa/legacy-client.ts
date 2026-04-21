// Устаревший клиент на базе @a2seven/yoo-checkout.
// Сохранён для совместимости с create-payment.ts до миграции на новый fetch-клиент.
// Новый код использует getYookassaClient() из client.ts.
import { YooCheckout } from '@a2seven/yoo-checkout';

export function getYookassaClient(): YooCheckout {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    throw new Error('ЮKassa не настроена: задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY');
  }
  return new YooCheckout({ shopId, secretKey });
}
