/**
 * Backfill-скрипт для Фазы C2 — ProjectMember.
 *
 * Все существующие проекты получают memberPolicy = WORKSPACE_WIDE.
 * Это безопасный дефолт: все участники workspace продолжают видеть все проекты,
 * поведение не изменяется до явного переключения на ASSIGNED_ONLY.
 *
 * Запуск: npx ts-node scripts/backfill-project-members.ts
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('[backfill] Начало: установка memberPolicy = WORKSPACE_WIDE для всех объектов...');

    const result = await prisma.buildingObject.updateMany({
      where: {
        memberPolicy: { not: 'WORKSPACE_WIDE' },
      },
      data: { memberPolicy: 'WORKSPACE_WIDE' },
    });

    console.log(`[backfill] Обновлено объектов: ${result.count}`);

    const total = await prisma.buildingObject.count();
    console.log(`[backfill] Всего объектов в БД: ${total}`);
    console.log('[backfill] Готово. Все существующие проекты имеют WORKSPACE_WIDE.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[backfill] Ошибка:', err);
  process.exit(1);
});
