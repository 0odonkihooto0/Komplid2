-- Migration: add missing columns to gantt_tasks
-- These fields were added to prisma/schema.prisma but never had a corresponding migration.
-- All statements use IF NOT EXISTS to be idempotent (safe on fresh and existing DBs).

-- Скалярные числовые поля
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "manHours"      DOUBLE PRECISION;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "machineHours"  DOUBLE PRECISION;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "amountVat"     DOUBLE PRECISION;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "weight"        DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Дата-поле
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "deadline"      TIMESTAMP(3);

-- Строковые поля (nullable)
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "comment"               TEXT;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "costType"              TEXT;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "workType"              TEXT;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "basis"                 TEXT;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "calcType"              TEXT;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "delegatedToVersionId"  TEXT;

-- materialDistribution: nullable строка с дефолтом UNIFORM
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "materialDistribution"  TEXT DEFAULT 'UNIFORM';

-- Массив ключей S3 вложений
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "attachmentS3Keys"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- FK к контракту задачи (отдельно от contractId версии)
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "taskContractId" TEXT;

DO $$ BEGIN
  ALTER TABLE "gantt_tasks"
    ADD CONSTRAINT "gantt_tasks_taskContractId_fkey"
    FOREIGN KEY ("taskContractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
