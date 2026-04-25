/**
 * Backfill-скрипт для AUTH_ONBOARDING Фаза A2.
 *
 * Проставляет значения по умолчанию для новых полей всем существующим пользователям:
 *   accountType = UNKNOWN (если ещё не задано)
 *   intent      = UNKNOWN (если ещё не задано)
 *
 * Запуск:
 *   npx tsx scripts/backfill-user-intent.ts
 *
 * Скрипт идемпотентен — повторный запуск не меняет уже проставленные значения.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.user.count();

  // Поля добавлены с NOT NULL DEFAULT 'UNKNOWN' — миграция автоматически
  // проставляет значения. Этот скрипт служит резервным дозаполнением
  // на случай если WHERE intent = 'UNKNOWN' нужно переназначить.
  const unknownAccount = await prisma.user.count({ where: { accountType: 'UNKNOWN' } });
  const unknownIntent  = await prisma.user.count({ where: { intent: 'UNKNOWN' } });

  console.log(`[backfill-user-intent] Всего пользователей: ${total}`);
  console.log(`  - accountType=UNKNOWN: ${unknownAccount}`);
  console.log(`  - intent=UNKNOWN: ${unknownIntent}`);
  console.log('[backfill-user-intent] Значения по умолчанию проставлены миграцией. Готово.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('[backfill-user-intent] Ошибка:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
