/**
 * Находит имя failed миграции в _prisma_migrations.
 * Выводит имя в stdout (для захвата через $() в shell).
 * Exit code 0 = найдена, 1 = не найдена.
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const db = new PrismaClient();
  try {
    const rows = await db.$queryRawUnsafe(
      `SELECT migration_name FROM _prisma_migrations
       WHERE finished_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`
    );
    if (rows.length > 0) {
      process.stdout.write(rows[0].migration_name);
      process.exit(0);
    }
    process.exit(1);
  } catch {
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
