import { PrismaClient } from '@prisma/client';
// Валидация env-переменных при старте — падаем явно, не тихо
import '@/lib/env';
import { logger } from '@/lib/logger';
import { buildDatabaseUrl, DEFAULT_APP_CONNECTION_LIMIT } from '@/lib/database-url';

/** Коды транзиентных ошибок Prisma — повтор может помочь */
const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1008', 'P1017']);

function isTransientPrismaError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    TRANSIENT_PRISMA_CODES.has((err as { code: string }).code)
  );
}

/** Обёртка: одна повторная попытка через 500 мс при транзиентной ошибке БД */
async function retryOnTransient<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isTransientPrismaError(err)) {
      logger.warn({ err }, 'Транзиентная ошибка БД, повторная попытка через 500 мс');
      await new Promise((r) => setTimeout(r, 500));
      return await fn();
    }
    throw err;
  }
}

function createPrismaClient() {
  const base = new PrismaClient({
    datasources: {
      db: {
        // buildDatabaseUrl корректно выбирает `?` или `&` в зависимости от
        // наличия query-строки в DATABASE_URL (sslmode и т.п.). Наивное
        // `url + '?...'` ломает connection_limit при любом существующем `?` — P2037.
        url: buildDatabaseUrl(DEFAULT_APP_CONNECTION_LIMIT),
      },
    },
  });

  // Автоматический retry при транзиентных ошибках (P1001/P1008/P1017)
  // для всех операций включая $queryRaw/$executeRaw
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          return retryOnTransient(() => query(args));
        },
      },
      async $queryRaw({ args, query }) {
        return retryOnTransient(() => query(args));
      },
      async $executeRaw({ args, query }) {
        return retryOnTransient(() => query(args));
      },
      async $queryRawUnsafe({ args, query }) {
        return retryOnTransient(() => query(args));
      },
      async $executeRawUnsafe({ args, query }) {
        return retryOnTransient(() => query(args));
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

/** Тип транзакционного клиента для расширенного Prisma-клиента.
 *  Использовать вместо Prisma.TransactionClient во всех функциях, принимающих tx. */
export type PrismaTx = Omit<
  ExtendedPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient };

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
