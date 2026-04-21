import IPCIDR from 'ip-cidr';

// Официальный IP-whitelist ЮKassa (актуален на апрель 2026):
// https://yookassa.ru/developers/using-api/webhooks
export const YOOKASSA_CIDR_LIST = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.154.128/25',
  '77.75.156.11/32',
  '77.75.156.35/32',
] as const;

// Строим диапазоны один раз при загрузке модуля — не при каждом запросе
const cidrRanges = YOOKASSA_CIDR_LIST.map((cidr) => new IPCIDR(cidr));

/**
 * Проверяет, что IP входит в белый список ЮKassa.
 * IPv6-адрес ЮKassa начинается с 2a02:5180: — обрабатывается отдельно,
 * т.к. ip-cidr поддерживает только IPv4 CIDR.
 */
export function isYookassaIp(ip: string): boolean {
  if (!ip) return false;
  // IPv6-диапазон ЮKassa /32 (2a02:5180::/32)
  if (ip.startsWith('2a02:5180:')) return true;
  return cidrRanges.some((range) => range.contains(ip));
}
