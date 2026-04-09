-- Ремонтная миграция: воспроизводит ПОЛНЫЙ SQL из 20260403000000_add_module7_gpr_step1,
-- которая была помечена --applied, но SQL никогда не выполнялся в продакшн.
-- Полностью идемпотентна: безопасна при повторном выполнении.

-- ─── Создание таблицы gantt_stages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "gantt_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gantt_stages_pkey" PRIMARY KEY ("id")
);

-- ─── Создание таблицы gantt_daily_plans ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "gantt_daily_plans" (
    "id" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "workers" INTEGER,
    "machinery" TEXT,
    "volume" DOUBLE PRECISION,
    "unit" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gantt_daily_plans_pkey" PRIMARY KEY ("id")
);

-- ─── Добавление столбцов в gantt_versions ───────────────────────────────────
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "stageId" TEXT;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "isDirective" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- ─── Добавление столбцов в gantt_tasks ──────────────────────────────────────
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "directiveStart" TIMESTAMP(3);
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "directiveEnd" TIMESTAMP(3);
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "volume" DOUBLE PRECISION;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "volumeUnit" TEXT;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "isMilestone" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "calendarType" TEXT;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "linkedExecutionDocsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "estimateItemId" TEXT;

-- ─── Индексы ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "gantt_stages_projectId_idx" ON "gantt_stages"("projectId");
CREATE INDEX IF NOT EXISTS "gantt_daily_plans_taskId_idx" ON "gantt_daily_plans"("taskId");
CREATE INDEX IF NOT EXISTS "gantt_daily_plans_planDate_idx" ON "gantt_daily_plans"("planDate");
CREATE INDEX IF NOT EXISTS "gantt_versions_projectId_idx" ON "gantt_versions"("projectId");
CREATE INDEX IF NOT EXISTS "gantt_tasks_estimateItemId_idx" ON "gantt_tasks"("estimateItemId");

-- ─── FK constraints (идемпотентно через DO block) ───────────────────────────
DO $$ BEGIN
  ALTER TABLE "gantt_stages" ADD CONSTRAINT "gantt_stages_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_daily_plans" ADD CONSTRAINT "gantt_daily_plans_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_daily_plans" ADD CONSTRAINT "gantt_daily_plans_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_stageId_fkey"
    FOREIGN KEY ("stageId") REFERENCES "gantt_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_estimateItemId_fkey"
    FOREIGN KEY ("estimateItemId") REFERENCES "estimate_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
