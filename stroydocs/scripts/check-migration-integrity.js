/**
 * Проверка целостности _prisma_migrations.
 *
 * Если записи в _prisma_migrations есть (помечены через --applied),
 * но ключевые таблицы отсутствуют — значит миграции были помечены
 * как applied без фактического выполнения SQL.
 *
 * В этом случае очищаем _prisma_migrations и даём migrate deploy
 * применить миграции заново.
 */
const { PrismaClient } = require('@prisma/client');

// Ключевые таблицы из разных модульных миграций
const KEY_TABLES = [
  'users',               // init
  'approval_steps',      // phase3_remaining
  'correspondences',     // module3
  'design_tasks',        // module5_pir
  'estimate_versions',   // module6_estimates
  'material_requests',   // module8_resources
  'special_journals',    // module9_journals
  'inspection_acts',     // module11_sk
  'reports',             // module12_reports
  'bim_models',          // module13_tim
];

async function main() {
  const db = new PrismaClient();
  try {
    // Проверяем, есть ли записи в _prisma_migrations
    let migrationCount = 0;
    try {
      const rows = await db.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS cnt FROM _prisma_migrations'
      );
      migrationCount = rows[0].cnt;
    } catch {
      // _prisma_migrations не существует — свежая БД, migrate deploy создаст
      console.log('[integrity] _prisma_migrations не найдена — свежая БД');
      return;
    }

    if (migrationCount === 0) {
      console.log('[integrity] _prisma_migrations пуста — свежая БД');
      return;
    }

    // Проверяем наличие ключевых таблиц
    const missing = [];
    for (const table of KEY_TABLES) {
      try {
        await db.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 0`);
      } catch {
        missing.push(table);
      }
    }

    if (missing.length === 0) {
      console.log('[integrity] Все ключевые таблицы присутствуют — OK');
      return;
    }

    console.log(
      `[integrity] Отсутствуют таблицы: ${missing.join(', ')}`
    );
    console.log(
      `[integrity] _prisma_migrations содержит ${migrationCount} записей — ошибочные`
    );
    console.log('[integrity] Очистка _prisma_migrations...');
    await db.$executeRawUnsafe('TRUNCATE "_prisma_migrations"');
    console.log('[integrity] Done — migrate deploy применит миграции заново');
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.log('[integrity] Ошибка проверки: ' + e.message);
  // Не блокируем запуск — migrate deploy сам разберётся
});
