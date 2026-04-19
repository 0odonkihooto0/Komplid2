import { redis } from '@/lib/redis';
import { db } from '@/lib/db';

const TTL = 60 * 60; // 1 час — соответствует TTL pre-signed URL

type RefModel = 'defectCategoryRef' | 'problemIssueTypeRef' | 'taskTypeRef';

async function getRefId(modelName: RefModel, slug: string, code: string): Promise<string | null> {
  const key = `refs:${slug}:${code}`;
  try {
    const cached = await redis.get(key);
    if (cached) return cached;
  } catch {
    // Redis недоступен — продолжаем без кэша
  }

  const model = (db as unknown as Record<string, { findUnique: (args: { where: { code: string } }) => Promise<{ id: string } | null> }>)[modelName];
  const ref = await model.findUnique({ where: { code } });
  if (ref) {
    try {
      await redis.set(key, ref.id, 'EX', TTL);
    } catch {
      // Не критично — следующий запрос снова обратится в БД
    }
    return ref.id;
  }
  return null;
}

export async function getDefectCategoryRefId(code: string): Promise<string | null> {
  return getRefId('defectCategoryRef', 'defectCategories', code);
}

export async function getProblemIssueTypeRefId(code: string): Promise<string | null> {
  return getRefId('problemIssueTypeRef', 'problemIssueTypes', code);
}

export async function getTaskTypeRefId(code: string): Promise<string | null> {
  return getRefId('taskTypeRef', 'taskTypeRefs', code);
}
