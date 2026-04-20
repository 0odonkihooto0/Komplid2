import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse } from '@/utils/api';
import { timingSafeEqual, createHash } from 'crypto';

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

/**
 * Безопасное сравнение строк с защитой от тайминг-атак.
 */
export function secureCompare(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}
