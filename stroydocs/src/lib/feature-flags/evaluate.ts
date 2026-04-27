import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { createHash } from 'crypto';
import type { FeatureFlagAudiences } from './flags';

const CACHE_TTL_SECONDS = 60;

interface FlagData {
  id: string;
  key: string;
  enabled: boolean;
  rolloutPercent: number;
  audiences: FeatureFlagAudiences | null;
}

interface EvaluateContext {
  userId?: string;
  workspaceId?: string;
  intent?: string;
}

// Загружает флаг из Redis-кеша, при промахе — из БД.
// При недоступном Redis — fallback прямо к БД (graceful degradation).
async function getFlag(key: string): Promise<FlagData | null> {
  const cacheKey = `ff:${key}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as FlagData;
  } catch {
    // Redis недоступен — читаем из БД напрямую
  }

  const flag = await db.featureFlag.findUnique({ where: { key } });
  if (!flag) return null;

  const data: FlagData = {
    id: flag.id,
    key: flag.key,
    enabled: flag.enabled,
    rolloutPercent: flag.rolloutPercent,
    audiences: flag.audiences as FeatureFlagAudiences | null,
  };

  try {
    await redis.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
  } catch {
    // Игнорируем ошибку записи в Redis
  }

  return data;
}

// Инвалидирует кеш флага при его изменении через admin API.
export async function invalidateFlagCache(key: string): Promise<void> {
  try {
    await redis.del(`ff:${key}`);
  } catch {
    // Игнорируем — кеш протухнет сам по TTL
  }
}

// Детерминированный hash для rollout: одинаковый userId+key всегда даёт один результат.
function hashRollout(userId: string, key: string): number {
  const hash = createHash('sha256').update(`${userId}:${key}`).digest('hex');
  return parseInt(hash.slice(0, 8), 16) % 100;
}

// Проверяет, включён ли feature-flag для данного контекста.
// Логика:
// 1. Флаг не найден или disabled → false
// 2. workspaceId/userId в audiences → true (точечное включение)
// 3. hash(userId+key) % 100 < rolloutPercent → true (постепенный rollout)
export async function isFeatureFlagEnabled(
  key: string,
  ctx: EvaluateContext = {}
): Promise<boolean> {
  const flag = await getFlag(key);
  if (!flag || !flag.enabled) return false;

  const audiences = flag.audiences;

  // Точечное включение по workspaceId
  if (ctx.workspaceId && audiences?.workspaceIds?.includes(ctx.workspaceId)) {
    return true;
  }

  // Точечное включение по userId
  if (ctx.userId && audiences?.userIds?.includes(ctx.userId)) {
    return true;
  }

  // Точечное включение по intent
  if (ctx.intent && audiences?.intents?.includes(ctx.intent)) {
    return true;
  }

  // Постепенный rollout по userId
  if (flag.rolloutPercent > 0 && ctx.userId) {
    return hashRollout(ctx.userId, key) < flag.rolloutPercent;
  }

  // rolloutPercent=100 без userId — включено для всех
  if (flag.rolloutPercent >= 100) return true;

  return false;
}
