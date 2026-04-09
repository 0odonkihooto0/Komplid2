import { PrismaClient } from '@prisma/client';
// Валидация env-переменных при старте — падаем явно, не тихо
import '@/lib/env';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '?connection_limit=10&pool_timeout=20',
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
