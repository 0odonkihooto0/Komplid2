import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

const CACHE_TTL_SECONDS = 5 * 60; // 5 минут

/**
 * Получить данные из кэша или вычислить и сохранить.
 * Используется для кэширования аналитических запросов.
 */
export async function getCachedAnalytics<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    // Redis недоступен — продолжаем без кэша
    logger.warn({ err, key }, 'Redis недоступен, аналитика без кэша');
  }

  const data = await fetcher();

  try {
    await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err, key }, 'Не удалось записать аналитику в кэш');
  }

  return data;
}

/**
 * Инвалидировать кэш аналитики для проекта и глобальный кэш организации.
 */
export async function invalidateAnalyticsCache(
  projectId: string,
  orgId: string,
): Promise<void> {
  try {
    await redis.del(
      `analytics:project:${projectId}`,
      `analytics:global:${orgId}`,
    );
  } catch (err) {
    logger.warn({ err, projectId, orgId }, 'Не удалось инвалидировать кэш аналитики');
  }
}
