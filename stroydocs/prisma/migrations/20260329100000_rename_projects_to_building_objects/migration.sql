-- Переименование таблицы projects → building_objects
-- (схема уже использует @@map("building_objects"), миграция отсутствовала)
--
-- Идемпотентно: на БД, созданной через db push (таблица сразу
-- называется "building_objects"), RENAME упадёт с 42P01 — глотаем.

DO $$ BEGIN
  ALTER TABLE "projects" RENAME TO "building_objects";
EXCEPTION
  WHEN undefined_table THEN NULL;  -- projects не существует — уже переименована
  WHEN duplicate_table THEN NULL;  -- building_objects уже существует
END $$;

-- Обновить FK-ограничение в contracts (projectId → building_objects)
ALTER TABLE "contracts"
  DROP CONSTRAINT IF EXISTS "contracts_projectId_fkey";
DO $$ BEGIN
  ALTER TABLE "contracts"
    ADD CONSTRAINT "contracts_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Обновить FK-ограничение в defects
ALTER TABLE "defects"
  DROP CONSTRAINT IF EXISTS "defects_projectId_fkey";
DO $$ BEGIN
  ALTER TABLE "defects"
    ADD CONSTRAINT "defects_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Обновить FK-ограничение в photos (если есть)
ALTER TABLE "photos"
  DROP CONSTRAINT IF EXISTS "photos_projectId_fkey";
