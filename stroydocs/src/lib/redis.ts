import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  redisErrorLogged: boolean | undefined;
};

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

function createRedisClient(): Redis {
  const options = parseRedisUrl(process.env.REDIS_URL || 'redis://localhost:6379');
  const client = new Redis({
    ...options,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 20) {
        console.warn('[redis] Остановка переподключения после 20 попыток');
        return null;
      }
      return Math.min(times * 500, 30_000);
    },
  });

  // Логируем только первую ошибку за цикл отключения.
  // При восстановлении соединения — сбрасываем флаг.
  client.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test' && !globalForRedis.redisErrorLogged) {
      globalForRedis.redisErrorLogged = true;
      console.warn('[redis] Connection error:', (err as Error).message ?? err);
    }
  });

  client.on('connect', () => {
    if (globalForRedis.redisErrorLogged) {
      console.log('[redis] Соединение восстановлено');
    }
    globalForRedis.redisErrorLogged = false;
  });

  return client;
}

// Синглтон через globalThis — гарантирует один клиент даже если модуль
// загружен из разных бандлов Next.js (API routes, server components)
export const redis = globalForRedis.redis ?? createRedisClient();
globalForRedis.redis = redis;
