import { createHash } from 'crypto';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

const CACHE_PREFIX = 'estimate:hash:';
const CACHE_TTL = 7 * 24 * 60 * 60; // 7 дней в секундах

/** Вычисление SHA-256 хэша файла */
export function computeFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Проверка кэша: возвращает importId если файл уже был обработан */
export async function getCachedImportId(hash: string): Promise<string | null> {
  try {
    const importId = await redis.get(`${CACHE_PREFIX}${hash}`);
    if (importId) {
      logger.info({ hash: hash.substring(0, 12) }, 'Найден кэшированный импорт');
    }
    return importId;
  } catch (error) {
    logger.warn({ error }, 'Ошибка чтения кэша Redis');
    return null;
  }
}

/** Сохранение хэша файла в кэш */
export async function cacheImportHash(hash: string, importId: string): Promise<void> {
  try {
    await redis.set(`${CACHE_PREFIX}${hash}`, importId, 'EX', CACHE_TTL);
    logger.debug({ hash: hash.substring(0, 12), importId }, 'Хэш сохранён в кэш');
  } catch (error) {
    logger.warn({ error }, 'Ошибка записи в кэш Redis');
  }
}
