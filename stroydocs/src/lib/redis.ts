import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function parseRedisUrl(rawUrl: string): RedisOptions {
  try {
    const url = new URL(rawUrl);
    return {
      host: url.hostname || 'localhost',
      port: Number(url.port) || 6379,
      // username нужен для Redis 6+ ACL (Timeweb Managed Redis использует 'default')
      ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
      ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
      ...(url.pathname && url.pathname !== '/' ? { db: Number(url.pathname.slice(1)) } : {}),
      // rediss:// → TLS включён
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

// Ограничение частоты логирования ошибок Redis (1 раз в 30 секунд)
let lastErrorLog = 0;
const ERROR_LOG_INTERVAL = 30_000;

function createRedisClient(): Redis {
  const options = parseRedisUrl(process.env.REDIS_URL || 'redis://localhost:6379');
  const client = new Redis({
    ...options,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy(times) {
      // Остановить после 20 попыток (суммарно ~5 минут с backoff)
      if (times > 20) return null;
      // Экспоненциальный backoff: 500ms → 1s → 1.5s → ... → max 30s
      return Math.min(times * 500, 30_000);
    },
  });

  // Регистрируем обработчик — подавляем «Unhandled error event» из ioredis
  client.on('error', (err) => {
    const now = Date.now();
    if (process.env.NODE_ENV !== 'test' && now - lastErrorLog > ERROR_LOG_INTERVAL) {
      lastErrorLog = now;
      console.warn('[redis] Connection error:', (err as Error).message ?? err);
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}
