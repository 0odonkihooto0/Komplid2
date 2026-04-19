/**
 * Корректная сборка DATABASE_URL с параметрами пула соединений.
 *
 * Почему не склеивать `DATABASE_URL + '?connection_limit=10'`:
 * если в URL уже есть query-строка (`?sslmode=require`, `?schema=public`
 * и т.п. — типично для Timeweb Managed PostgreSQL), два `?` ломают
 * парсинг: PostgreSQL считает всё после ПЕРВОГО `?` одной query-строкой,
 * а `connection_limit` уходит внутрь значения предыдущего параметра
 * и Prisma его не видит. Результат — применяется дефолт
 * `num_physical_cpus * 2 + 1`, пул раздувается, P2037.
 *
 * Использовать во всех местах, где создаётся `new PrismaClient()`:
 * основной синглтон, server.js (Socket.io), воркеры.
 */
export function buildDatabaseUrl(
  connectionLimit: number,
  poolTimeout = 20
): string {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('[database-url] DATABASE_URL не задан');

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
}

/** Лимит пула основного Next.js-клиента. По умолчанию 5 — экономим слоты
 *  PostgreSQL, т.к. в одном Node-процессе уже живут два пула (Next.js + server.js). */
export const DEFAULT_APP_CONNECTION_LIMIT = Number(
  process.env.DATABASE_CONNECTION_LIMIT ?? 5
);

/** Лимит пула для server.js (Socket.io чат) — 2 соединений хватает: нагрузка низкая. */
export const SOCKET_CONNECTION_LIMIT = Number(
  process.env.SOCKET_DATABASE_CONNECTION_LIMIT ?? 2
);

/** Лимит пула для BullMQ-воркеров — 2 соединений: один воркер = один процесс. */
export const WORKER_CONNECTION_LIMIT = Number(
  process.env.WORKER_DATABASE_CONNECTION_LIMIT ?? 2
);
