import { createHash, timingSafeEqual } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse } from '@/utils/api';

/**
 * Сравнение строк за константное время — защита от timing-атак.
 * SHA-256 нормализует длину перед timingSafeEqual.
 */
export function secureCompare(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Получить сессию или вернуть 401
 */
export async function getSessionOrThrow() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw errorResponse('Не авторизован', 401);
  }
  return session;
}

/**
 * Получить organizationId из сессии (для multi-tenancy фильтрации)
 */
export async function getOrganizationId() {
  const session = await getSessionOrThrow();
  return session.user.organizationId;
}
