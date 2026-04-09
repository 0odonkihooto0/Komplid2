-- Модуль 7 (ГПР): сделать contractId необязательным в gantt_tasks и gantt_versions
-- Версии и задачи объектного уровня создаются без привязки к контракту

-- === gantt_tasks ===

-- 1. Убрать NOT NULL constraint
ALTER TABLE "gantt_tasks" ALTER COLUMN "contractId" DROP NOT NULL;

-- 2. Заменить ON DELETE CASCADE → ON DELETE SET NULL
ALTER TABLE "gantt_tasks" DROP CONSTRAINT IF EXISTS "gantt_tasks_contractId_fkey";

ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- === gantt_versions ===

-- 3. Убрать NOT NULL constraint
ALTER TABLE "gantt_versions" ALTER COLUMN "contractId" DROP NOT NULL;

-- 4. Заменить ON DELETE CASCADE → ON DELETE SET NULL
ALTER TABLE "gantt_versions" DROP CONSTRAINT IF EXISTS "gantt_versions_contractId_fkey";

ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
