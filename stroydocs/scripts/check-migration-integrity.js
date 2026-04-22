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

// Ключевые таблицы из разных модульных миграций.
// ВАЖНО: список должен охватывать таблицы из поздних миграций (>= #88),
// чтобы обнаружить случай когда max_attempts в start.sh был меньше
// общего числа миграций и поздние миграции не были применены.
const KEY_TABLES = [
  'users',               // init (#1)
  'approval_steps',      // phase3_remaining (#3)
  'correspondences',     // module3 (#20)
  'design_tasks',        // module5_pir (#23)
  'estimate_versions',   // module6_estimates (#24)
  'material_requests',   // module8_resources (#27)
  'special_journals',    // module9_journals (#29)
  'inspection_acts',     // module11_sk (#31)
  'reports',             // module12_reports (#33)
  'bim_models',          // module13_tim (#32)
  'estimate_import_items', // add_normative_refs (#37)
  'workspaces',          // add_workspace_missing_columns (#93) — критично!
  'subscription_plans',  // add_subscriptions_payments (#88)
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
