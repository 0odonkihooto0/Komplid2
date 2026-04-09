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

function createRedisClient(): Redis {
  const options = parseRedisUrl(process.env.REDIS_URL || 'redis://localhost:6379');
  const client = new Redis({
    ...options,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  // Регистрируем обработчик — подавляем «Unhandled error event» из ioredis
  client.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[redis] Connection error:', (err as Error).message ?? err);
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}
