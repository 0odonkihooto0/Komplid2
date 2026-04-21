import { YooCheckout } from '@a2seven/yoo-checkout';

// Ленивая инициализация — не крашим сервер при отсутствии env.
// Если YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY не заданы,
// функция бросит ошибку только при попытке провести платёж.
export function getYookassaClient(): YooCheckout {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    throw new Error('ЮKassa не настроена: задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY');
  }
  return new YooCheckout({ shopId, secretKey });
}
