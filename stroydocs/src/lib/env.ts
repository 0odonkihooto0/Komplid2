/**
 * Валидация обязательных переменных окружения при старте сервера.
 * Импортируется в lib/db.ts — выполняется до первого запроса к БД.
 * При отсутствии переменной приложение падает с понятным сообщением,
 * а не тихо ломается в рандомном месте.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'APP_URL',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'REDIS_URL',
  'CRON_SECRET',
  'ADMIN_SECRET',
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

// Проверяем только на сервере (не в браузере) и не во время next build,
// т.к. Timeweb App Platform инжектирует переменные окружения только в runtime.
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Отсутствуют обязательные переменные окружения:\n  ${missing.join('\n  ')}\n` +
        `Скопируйте .env.example в .env.local и задайте значения.`
    );
  }
}

export const env = Object.fromEntries(
  REQUIRED_ENV_VARS.map((key) => [key, process.env[key] as string])
) as Record<RequiredEnvVar, string>;
