/**
 * bulk-mark-stale-migrations.js
 *
 * Быстро помечает уже-существующие в БД (через db push) миграции как applied
 * в _prisma_migrations. Сокращает количество итераций в start.sh с ~80 до ~15-20,
 * что укладывается в лимит health check (~60с вместо ~8 мин).
 *
 * Алгоритм:
 *   1. Читаем список уже applied миграций из _prisma_migrations
 *   2. Для каждой не-applied миграции:
 *      a. Если в ALWAYS_RUN → пропускаем (migrate deploy применит её безопасно)
 *      b. Находим "первичный объект" (первый CREATE TABLE, CREATE TYPE, ADD COLUMN)
 *      c. Если объект уже существует в БД → INSERT в _prisma_migrations (applied)
 *      d. Если не существует → migrate deploy создаст его
 *   3. Идемпотентен: WHERE NOT EXISTS защищает от двойной вставки
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Rescue-миграции: полностью идемпотентны (IF NOT EXISTS / DO $$ EXCEPTION).
// НЕЛЬЗЯ помечать как applied — они должны выполниться через migrate deploy,
// чтобы гарантированно добавить все недостающие колонки/таблицы/enums.
const ALWAYS_RUN = new Set([
  '20260421060000_add_workspace_missing_columns',
  '20260422000000_fix_missing_workspace_column',
  '20260422010000_fix_normative_refs_idempotent',
  '20260422020000_fix_subscriptions_idempotent',
  '20260423000000_ensure_workspace_columns_final',
  '20260424000000_global_subscription_workspace_recovery',
]);

/**
 * Извлекает первичный объект из SQL для проверки существования в БД.
 * Возвращает null если миграция идемпотентна (IF NOT EXISTS / DO $$).
 */
function extractPrimaryObject(sql) {
  // Bare CREATE TABLE "name" (без IF NOT EXISTS — нет IF между TABLE и кавычкой)
  const tableMatch = sql.match(/\bCREATE TABLE\s+"([^"]+)"/i);
  if (tableMatch) {
    return { kind: 'table', name: tableMatch[1] };
  }

  // Bare CREATE TYPE "name" AS ENUM (не внутри DO $$ блока)
  // Если файл содержит DO $$ — значит уже есть идемпотентность, пропускаем
  if (!sql.includes('DO $$') && !sql.includes("DO $do$")) {
    const enumMatch = sql.match(/\bCREATE TYPE\s+"([^"]+)"\s+AS\s+ENUM/i);
    if (enumMatch) {
      return { kind: 'enum', name: enumMatch[1] };
    }
  }

  // Bare ADD COLUMN "name" (без IF NOT EXISTS — нет IF между COLUMN и кавычкой)
  const colMatch = sql.match(/\bADD COLUMN\s+"([^"]+)"/i);
  if (colMatch) {
    const tblMatch = sql.match(/ALTER TABLE\s+"([^"]+)"\s+ADD COLUMN/i);
    if (tblMatch) {
      return { kind: 'column', table: tblMatch[1], column: colMatch[1] };
    }
  }

  return null; // идемпотентная или неизвестный паттерн — migrate deploy разберётся
}

/**
 * Проверяет существование первичного объекта в PostgreSQL.
 */
async function primaryObjectExists(db, obj) {
  if (!obj) return false;
  try {
    if (obj.kind === 'table') {
      const rows = await db.$queryRawUnsafe(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
        obj.name
      );
      return rows.length > 0;
    }
    if (obj.kind === 'enum') {
      const rows = await db.$queryRawUnsafe(
        `SELECT 1 FROM pg_type WHERE typname = $1 AND typtype = 'e' LIMIT 1`,
        obj.name
      );
      return rows.length > 0;
    }
    if (obj.kind === 'column') {
      const rows = await db.$queryRawUnsafe(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
        obj.table, obj.column
      );
      return rows.length > 0;
    }
  } catch {
    return false;
  }
  return false;
}

async function main() {
  const db = new PrismaClient();
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');

  try {
    // Читаем список уже applied миграций
    let applied;
    try {
      const rows = await db.$queryRawUnsafe(
        `SELECT migration_name FROM _prisma_migrations`
      );
      applied = new Set(rows.map(r => r.migration_name));
    } catch (e) {
      console.log('[bulk-mark] _prisma_migrations недоступна, пропускаем: ' + e.message);
      return;
    }

    // Сортированный список директорий миграций
    const dirs = fs.readdirSync(migrationsDir)
      .filter(d => d !== 'migration_lock.toml' && fs.existsSync(path.join(migrationsDir, d, 'migration.sql')))
      .sort();

    let marked = 0;
    let willRun = 0;

    // Считаем БД "не пустой" если уже есть applied-миграции либо
    // если в БД есть базовые таблицы (users, organizations).
    // Используется для миграций без первичного CREATE-объекта
    // (RENAME/ALTER/DROP) — на не-пустой БД они должны быть помечены
    // applied, иначе запустятся заново и упадут с 42P01/42710.
    let dbHasContent = applied.size > 0;
    if (!dbHasContent) {
      try {
        const rows = await db.$queryRawUnsafe(
          `SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1`
        );
        dbHasContent = rows.length > 0;
      } catch { /* ignore */ }
    }

    for (const dir of dirs) {
      if (applied.has(dir)) continue;

      if (ALWAYS_RUN.has(dir)) {
        willRun++;
        continue;
      }

      const sqlPath = path.join(migrationsDir, dir, 'migration.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      const primaryObj = extractPrimaryObject(sql);

      // Миграции без первичного CREATE-объекта (только RENAME/ALTER/DROP)
      // на не-пустой БД помечаем applied — повторный запуск таких миграций
      // обычно падает (RENAME несуществующего, ADD VALUE дубликата и т.д.).
      if (!primaryObj && dbHasContent) {
        const checksum = crypto.createHash('sha256').update(sql).digest('hex');
        const id = crypto.randomUUID();
        try {
          await db.$executeRawUnsafe(
            `INSERT INTO _prisma_migrations
               (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
             SELECT $1, $2, NOW(), $3, '', NULL, NOW(), 1
             WHERE NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name = $3)`,
            id, checksum, dir
          );
          console.log('[bulk-mark] ' + dir + ': applied (no primary object, db not empty)');
          marked++;
        } catch (err) {
          console.log('[bulk-mark] ' + dir + ': ошибка вставки — ' + err.message);
        }
        continue;
      }

      const exists = await primaryObjectExists(db, primaryObj);

      if (!exists) {
        willRun++;
        continue;
      }

      // Объект уже существует в БД — миграция применена через db push
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const id = crypto.randomUUID();

      try {
        await db.$executeRawUnsafe(
          `INSERT INTO _prisma_migrations
             (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           SELECT $1, $2, NOW(), $3, '', NULL, NOW(), 1
           WHERE NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name = $3)`,
          id, checksum, dir
        );
        console.log('[bulk-mark] ' + dir + ': applied');
        marked++;
      } catch (err) {
        console.log('[bulk-mark] ' + dir + ': ошибка вставки — ' + err.message);
      }
    }

    console.log(
      '[bulk-mark] Итого: applied=' + (applied.size + marked) +
      ' (новых=' + marked + ')' +
      ' к_выполнению=' + willRun
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch(e => {
  console.error('[bulk-mark] Ошибка: ' + e.message);
  // Не блокируем старт — цикл в start.sh справится с остатком
  process.exit(0);
});
