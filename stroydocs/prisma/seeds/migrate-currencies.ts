/**
 * Миграционный скрипт REF.8: заполнить FK-поля currencyId/budgetTypeId/contractKindId
 * на основе текущих строковых и enum-значений в существующих записях.
 *
 * Запускать ОДИН РАЗ вручную после деплоя миграции add_currency_contractkind_budgettype_fk:
 *   npx ts-node prisma/seeds/migrate-currencies.ts
 *
 * Идемпотентен: повторный запуск обновляет только записи с null FK.
 *
 * Маппинг FundingType → BudgetType.code:
 *   CREDIT       → 'CREDIT'    (прямое совпадение)
 *   OWN          → 'OWN'       (прямое совпадение)
 *   BUDGET       → null        (нет прямого совпадения: FED/REG/LOC — разные концепции)
 *   EXTRA_BUDGET → null        (нет совпадения — пользователь уточняет вручную)
 *
 * Маппинг WarehouseMovement.currency → Currency.code: прямое совпадение по коду.
 *
 * Contract.contractKindId — не мигрируется автоматически (MAIN/SUBCONTRACT ≠ вид работ).
 * Пользователь заполняет вручную. Скрипт логирует количество незаполненных записей.
 */

import { PrismaClient } from '@prisma/client';

const BATCH = 100;

const prisma = new PrismaClient();

// ─── Миграция WarehouseMovement.currency → currencyId ────────────────────────

async function migrateWarehouseMovementCurrencies(): Promise<{
  updated: number;
  unmapped: number;
}> {
  let updated = 0;
  let unmapped = 0;
  let skip = 0;

  const currencies = await prisma.currency.findMany({ select: { id: true, code: true } });
  const currencyMap = new Map(currencies.map((c) => [c.code, c.id]));

  if (currencyMap.size === 0) {
    console.warn('⚠️  Currency справочник пуст — запустите seed перед миграцией');
    return { updated: 0, unmapped: 0 };
  }

  for (;;) {
    const batch = await prisma.warehouseMovement.findMany({
      where: { currencyId: null },
      select: { id: true, currency: true },
      take: BATCH,
      skip,
    });

    if (batch.length === 0) break;

    const results = await Promise.all(
      batch.map((m) => {
        const refId = currencyMap.get(m.currency);
        if (!refId) {
          console.warn(`  ⚠️  Нет валюты с кодом '${m.currency}' (movement id=${m.id})`);
          unmapped++;
          return Promise.resolve(null);
        }
        return prisma.warehouseMovement.update({ where: { id: m.id }, data: { currencyId: refId } });
      })
    );

    const count = results.filter(Boolean).length;
    updated += count;
    skip += BATCH - count;
    console.log(`  warehouse_movements: обработано ${skip + count}...`);
  }

  return { updated, unmapped };
}

// ─── Миграция FundingSource.type → budgetTypeId ───────────────────────────────

const FUNDING_TYPE_TO_BUDGET_CODE: Record<string, string | null> = {
  CREDIT: 'CREDIT',
  OWN: 'OWN',
  BUDGET: null,       // нет прямого совпадения — FED/REG/LOC разные концепции
  EXTRA_BUDGET: null, // нет совпадения — пользователь уточняет вручную
};

async function migrateFundingSources(): Promise<{ updated: number; unmapped: number }> {
  let updated = 0;
  let unmapped = 0;
  let skip = 0;

  const budgetTypes = await prisma.budgetType.findMany({ select: { id: true, code: true } });
  const budgetTypeMap = new Map(budgetTypes.map((b) => [b.code, b.id]));

  if (budgetTypeMap.size === 0) {
    console.warn('⚠️  BudgetType справочник пуст — запустите seed перед миграцией');
    return { updated: 0, unmapped: 0 };
  }

  for (;;) {
    const batch = await prisma.fundingSource.findMany({
      where: { budgetTypeId: null },
      select: { id: true, type: true },
      take: BATCH,
      skip,
    });

    if (batch.length === 0) break;

    const results = await Promise.all(
      batch.map((s) => {
        const targetCode = FUNDING_TYPE_TO_BUDGET_CODE[s.type];
        if (targetCode === null) {
          // Намеренно не маппируется — требует ручного заполнения
          unmapped++;
          skip++;
          return Promise.resolve(null);
        }
        if (targetCode === undefined) {
          console.warn(`  ⚠️  Неизвестный FundingType '${s.type}' (source id=${s.id})`);
          unmapped++;
          skip++;
          return Promise.resolve(null);
        }
        const refId = budgetTypeMap.get(targetCode);
        if (!refId) {
          console.warn(`  ⚠️  BudgetType с кодом '${targetCode}' не найден`);
          unmapped++;
          skip++;
          return Promise.resolve(null);
        }
        return prisma.fundingSource.update({ where: { id: s.id }, data: { budgetTypeId: refId } });
      })
    );

    const count = results.filter(Boolean).length;
    updated += count;
    console.log(`  funding_sources: обработано ${skip}...`);
  }

  return { updated, unmapped };
}

// ─── Подсчёт незаполненных Contract.contractKindId ───────────────────────────

async function countContractsWithoutKind(): Promise<number> {
  return prisma.contract.count({ where: { contractKindId: null } });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Миграция REF.8: currency/budgetType/contractKind FK ===\n');

  console.log('1. WarehouseMovement.currency → currencyId');
  const { updated: wmUpdated, unmapped: wmUnmapped } = await migrateWarehouseMovementCurrencies();
  console.log(`✅ Обновлено warehouse_movements: ${wmUpdated}, не найдено: ${wmUnmapped}`);

  console.log('\n2. FundingSource.type → budgetTypeId');
  const { updated: fsUpdated, unmapped: fsUnmapped } = await migrateFundingSources();
  console.log(`✅ Обновлено funding_sources: ${fsUpdated}`);
  if (fsUnmapped > 0) {
    console.log(
      `⚠️  Не мигрировано (BUDGET/EXTRA_BUDGET — нет прямого совпадения): ${fsUnmapped}`,
      '\n   Пользователь должен уточнить тип вручную в UI → Паспорт объекта → Финансирование'
    );
  }

  console.log('\n3. Contract.contractKindId — не мигрируется автоматически');
  const contractsWithoutKind = await countContractsWithoutKind();
  console.log(
    `ℹ️  Договоров без вида работ (contractKindId=null): ${contractsWithoutKind}`,
    '\n   Пользователь заполняет вручную в карточке договора.'
  );

  console.log('\nМиграция REF.8 завершена.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
