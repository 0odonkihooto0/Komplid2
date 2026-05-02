import { logger } from '@/lib/logger';

/**
 * Отправка SMS через sms.ru API.
 * Если SMS_API_KEY не задан — логирует warning и возвращается без ошибки (email fallback).
 * Env: SMS_API_KEY, SMS_SENDER (опционально)
 */
export async function sendSms(phone: string, text: string): Promise<void> {
  if (!process.env.SMS_API_KEY) {
    logger.warn({ phone }, '[sms] SMS_API_KEY не задан — SMS не отправлен, используйте email');
    return;
  }

  const params = new URLSearchParams({
    api_id: process.env.SMS_API_KEY,
    to: phone,
    msg: text,
    json: '1',
  });

  if (process.env.SMS_SENDER) {
    params.set('from', process.env.SMS_SENDER);
  }

  const url = `https://sms.ru/sms/send?${params.toString()}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const json = await res.json() as { status: string; status_code?: number; status_text?: string };

    if (json.status !== 'OK') {
      logger.error({ phone, status: json.status, code: json.status_code, text: json.status_text }, '[sms] Ошибка отправки SMS');
    } else {
      logger.info({ phone }, '[sms] SMS отправлен');
    }
  } catch (err) {
    logger.error({ err, phone }, '[sms] Исключение при отправке SMS');
  }
}
