-- Переименование таблицы projects → building_objects
-- (схема уже использует @@map("building_objects"), миграция отсутствовала)

ALTER TABLE "projects" RENAME TO "building_objects";

-- Обновить FK-ограничение в contracts (projectId → building_objects)
ALTER TABLE "contracts"
  DROP CONSTRAINT IF EXISTS "contracts_projectId_fkey";
ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Обновить FK-ограничение в defects
ALTER TABLE "defects"
  DROP CONSTRAINT IF EXISTS "defects_projectId_fkey";
ALTER TABLE "defects"
  ADD CONSTRAINT "defects_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Обновить FK-ограничение в photos (если есть)
ALTER TABLE "photos"
  DROP CONSTRAINT IF EXISTS "photos_projectId_fkey";
