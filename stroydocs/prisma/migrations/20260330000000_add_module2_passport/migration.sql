-- Модуль 2: Паспорт объекта
-- Добавляем поля паспорта в building_objects, новые таблицы funding_sources и tasks

-- Новые enum'ы
CREATE TYPE "FundingType" AS ENUM ('BUDGET', 'EXTRA_BUDGET', 'CREDIT', 'OWN');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'DEFECT', 'COMMENT');

-- Новые поля паспорта в building_objects
ALTER TABLE "building_objects"
  ADD COLUMN IF NOT EXISTS "cadastralNumber"     TEXT,
  ADD COLUMN IF NOT EXISTS "area"                DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "floors"              INTEGER,
  ADD COLUMN IF NOT EXISTS "responsibilityClass" TEXT,
  ADD COLUMN IF NOT EXISTS "permitNumber"        TEXT,
  ADD COLUMN IF NOT EXISTS "permitDate"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "permitAuthority"     TEXT,
  ADD COLUMN IF NOT EXISTS "designOrg"           TEXT,
  ADD COLUMN IF NOT EXISTS "chiefEngineer"       TEXT,
  ADD COLUMN IF NOT EXISTS "plannedStartDate"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "plannedEndDate"      TIMESTAMP(3);

-- Таблица источников финансирования
CREATE TABLE "funding_sources" (
  "id"        TEXT NOT NULL,
  "type"      "FundingType" NOT NULL,
  "name"      TEXT NOT NULL,
  "amount"    DOUBLE PRECISION NOT NULL,
  "period"    TEXT,
  "notes"     TEXT,
  "projectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "funding_sources_pkey" PRIMARY KEY ("id")
);

-- Таблица задач по объекту
CREATE TABLE "tasks" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "status"      "TaskStatus"   NOT NULL DEFAULT 'OPEN',
  "priority"    "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "deadline"    TIMESTAMP(3),
  "sourceType"  "TaskSource"   NOT NULL DEFAULT 'MANUAL',
  "projectId"   TEXT NOT NULL,
  "contractId"  TEXT,
  "defectId"    TEXT,
  "assigneeId"  TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- Индексы
CREATE INDEX "funding_sources_projectId_idx" ON "funding_sources"("projectId");
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");

-- Внешние ключи
ALTER TABLE "funding_sources"
  ADD CONSTRAINT "funding_sources_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
