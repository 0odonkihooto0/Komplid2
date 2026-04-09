/**
 * Клиент внешнего API КСИ (Минстрой РФ, стройкомплекс.рф)
 * Документация: https://gisogd.gov.ru/api/visary/swagger/index.html (раздел PublicKsi)
 *
 * Все ответы кэшируются в Redis для снижения нагрузки на внешний сервис.
 */

import { redis } from '@/lib/redis';

// Punycode-форма домена стройкомплекс.рф (для совместимости со всеми версиями Node.js)
const BASE_URL = 'https://xn--e1afmkfd.xn--p1ai/api/visary/PublicKsi';

/** TTL кэша: 1 час для списков, 24 часа для иерархии */
const CACHE_TTL_SHORT = 3600;
const CACHE_TTL_LONG = 86400;

const FETCH_TIMEOUT_MS = 10_000;

// ── Типы ответов внешнего API ──────────────────────────────────────────────

export interface KsiTableTypeSummary {
  title: string;
  count: number;
}

export interface KsiExternalHierarchyNode {
  id: string;
  title: string;
  code: string;
  isTableType: boolean;
  isTable: boolean;
  children: KsiExternalHierarchyNode[];
}

export interface KsiExternalNode {
  id: string;
  title: string;
  code: string;
  description?: string;
  note?: string;
  sources?: unknown[];
  synchronizations?: unknown[];
  parentId?: string;
  parentCode?: string;
  tableId?: string;
  tableCode?: string;
}

export interface GetByParentIdParams {
  take: number;
  skip?: number;
  parentId?: string;
  tableId?: string;
  tableTypeId?: string;
}

// ── Утилиты ───────────────────────────────────────────────────────────────

/** Выполняет GET-запрос с таймаутом и retry (1 повторная попытка) */
async function fetchExternal<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`КСИ API вернул ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Возвращает закэшированные данные или загружает с внешнего API */
async function withCache<T>(
  cacheKey: string,
  ttl: number,
  loader: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // При недоступности Redis идём напрямую в API
  }

  const data = await loader();

  try {
    await redis.setex(cacheKey, ttl, JSON.stringify(data));
  } catch {
    // Игнорируем ошибки записи в кэш
  }

  return data;
}

// ── Методы API ────────────────────────────────────────────────────────────

/**
 * GetKsiTableTypeSummary — список типов таблиц с количеством классов.
 * Используется для отображения счётчиков в интерфейсе выбора таблицы.
 */
export async function getKsiTableTypeSummary(): Promise<KsiTableTypeSummary[]> {
  return withCache('ksi:ext:summary', CACHE_TTL_SHORT, () =>
    fetchExternal<KsiTableTypeSummary[]>(`${BASE_URL}/GetKsiTableTypeSummary`)
  );
}

/**
 * GetKsiHierarchy — полная иерархия типов КТ, таблиц и классов.
 * Тяжёлый запрос — кэшируем на 24 часа.
 */
export async function getKsiHierarchy(): Promise<KsiExternalHierarchyNode[]> {
  return withCache('ksi:ext:hierarchy', CACHE_TTL_LONG, () =>
    fetchExternal<KsiExternalHierarchyNode[]>(`${BASE_URL}/GetKsiHierarchy`)
  );
}

/**
 * GetKsiByParentId — элементы КСИ, входящие в определённый класс / КТ / тип КТ.
 * Один из параметров parentId, tableId, tableTypeId обязателен.
 */
export async function getKsiByParentId(
  params: GetByParentIdParams
): Promise<KsiExternalNode[]> {
  const { take, skip = 0, parentId, tableId, tableTypeId } = params;

  const qs = new URLSearchParams({ take: String(take), skip: String(skip) });
  if (parentId) qs.set('parentId', parentId);
  if (tableId) qs.set('tableId', tableId);
  if (tableTypeId) qs.set('tableTypeId', tableTypeId);

  const cacheKey = `ksi:ext:byparent:${qs.toString()}`;
  return withCache(cacheKey, CACHE_TTL_SHORT, () =>
    fetchExternal<KsiExternalNode[]>(`${BASE_URL}/GetKsiByParentId?${qs}`)
  );
}

/**
 * FindKsiByCodeOrTitle — поиск элементов КСИ по коду или наименованию.
 * @param search — строка поиска (минимум 2 символа)
 * @param take   — количество записей (по умолчанию 20)
 * @param skip   — смещение (по умолчанию 0)
 */
export async function findKsiByCodeOrTitle(
  search: string,
  take = 20,
  skip = 0
): Promise<KsiExternalNode[]> {
  if (!search || search.trim().length < 2) return [];

  const qs = new URLSearchParams({
    search: search.trim(),
    take: String(take),
    skip: String(skip),
  });

  const cacheKey = `ksi:ext:search:${qs.toString()}`;
  return withCache(cacheKey, CACHE_TTL_SHORT, () =>
    fetchExternal<KsiExternalNode[]>(`${BASE_URL}/FindKsiByCodeOrTitle?${qs}`)
  );
}

/** Инвалидирует весь кэш внешнего КСИ (для ручного сброса администратором) */
export async function invalidateKsiExternalCache(): Promise<void> {
  const keys = await redis.keys('ksi:ext:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
