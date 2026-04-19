/**
 * Хелперы для получения справочных объектов по коду с Redis-кешем (TTL 1 час).
 * Используются в API-роутах для резолва legacy-значений (currency string → currencyId FK).
 */

import { redis } from '@/lib/redis';
import { db } from '@/lib/db';
import type { Currency, BudgetType, ContractKind } from '@prisma/client';

const TTL = 60 * 60; // 1 час

async function withCache<T>(key: string, fetch: () => Promise<T | null>): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    // Redis недоступен — продолжаем без кэша
  }

  const value = await fetch();

  if (value !== null) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', TTL);
    } catch {
      // Не критично — следующий запрос снова обратится в БД
    }
  }

  return value;
}

export async function getCurrencyByCode(code: string): Promise<Currency | null> {
  return withCache(`refs:currency:code:${code}`, () =>
    db.currency.findFirst({ where: { code } })
  );
}

export async function getBudgetTypeByCode(code: string): Promise<BudgetType | null> {
  return withCache(`refs:budgetType:code:${code}`, () =>
    db.budgetType.findFirst({ where: { code } })
  );
}

export async function getContractKindByCode(code: string): Promise<ContractKind | null> {
  return withCache(`refs:contractKind:code:${code}`, () =>
    db.contractKind.findFirst({ where: { code } })
  );
}
