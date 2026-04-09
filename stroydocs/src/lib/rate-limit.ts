/**
 * Простой in-memory rate limiter для защиты от массовых запросов.
 * Для MVP достаточно — при масштабировании заменить на Redis-based.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Очистка устаревших записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * Проверка rate limit по ключу (обычно IP-адрес).
 * @returns true если запрос разрешён, false если превышен лимит
 */
export function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 60 * 1000
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  entry.count++;
  if (entry.count > limit) {
    return false;
  }

  return true;
}

/** Получить IP из NextRequest */
export function getClientIp(req: { headers: { get(name: string): string | null }; ip?: string }): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.ip ||
    'unknown'
  );
}
