-- ═══════════════════════════════════════════════════════════════════════════
-- Ремонтная миграция: добавляет все поля и таблицы, которые присутствуют
-- в schema.prisma, но отсутствуют в БД из-за пропущенных миграций.
-- Полностью идемпотентна: безопасна при повторном выполнении.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

-- IdCategory — классификация ИД по ГОСТ Р 70108-2025
DO $$ BEGIN
  CREATE TYPE "IdCategory" AS ENUM ('ACCOUNTING_JOURNAL', 'INSPECTION_ACT', 'OTHER_ID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- EstimateVersionStatus — статус пересчёта версии сметы
DO $$ BEGIN
  CREATE TYPE "EstimateVersionStatus" AS ENUM ('OK', 'EDITING', 'RECALCULATING', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- EstimateAdditionalCostType — тип дополнительного начисления
DO $$ BEGIN
  CREATE TYPE "EstimateAdditionalCostType" AS ENUM (
    'ACCRUAL_BY_WORK_TYPE',
    'ACCRUAL_TO_TOTALS',
    'TEMP_BUILDINGS',
    'WINTER_MARKUP',
    'ADDITIONAL_CURRENT_PRICES',
    'DEFLATOR_INDEX',
    'MINUS_CUSTOMER_RESOURCES',
    'VAT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- EstimateAdditionalCostApplicationMode — режим применения начисления
DO $$ BEGIN
  CREATE TYPE "EstimateAdditionalCostApplicationMode" AS ENUM (
    'BY_CHAPTERS',
    'BY_ESTIMATES',
    'BY_CHAPTERS_AND_ESTIMATES'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- EstimateCalculationMethod — метод расчёта начисления
DO $$ BEGIN
  CREATE TYPE "EstimateCalculationMethod" AS ENUM (
    'COEFFICIENT',
    'PERCENT',
    'FIXED_SUM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. КОЛОНКИ gantt_versions — делегирование и настройки версии
-- ─────────────────────────────────────────────────────────────────────────────

-- Делегирование между организациями
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "delegatedFromOrgId" TEXT;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "delegatedToOrgId" TEXT;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "delegatedFromVersionId" TEXT;

-- Настройки версии ГПР
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "calculationMethod" TEXT DEFAULT 'MANUAL';
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "allowOverplan" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "showSummaryRow" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "lockWorks" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "lockPlan" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "lockFact" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "disableVolumeRounding" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "linkedVersionIds" TEXT[] DEFAULT '{}';
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "accessOrgIds" TEXT[] DEFAULT '{}';
ALTER TABLE "gantt_versions" ADD COLUMN IF NOT EXISTS "columnSettings" JSONB;

-- Индексы для делегирования
CREATE INDEX IF NOT EXISTS "gantt_versions_delegatedFromOrgId_idx" ON "gantt_versions"("delegatedFromOrgId");
CREATE INDEX IF NOT EXISTS "gantt_versions_delegatedToOrgId_idx" ON "gantt_versions"("delegatedToOrgId");
CREATE INDEX IF NOT EXISTS "gantt_versions_delegatedFromVersionId_idx" ON "gantt_versions"("delegatedFromVersionId");
CREATE INDEX IF NOT EXISTS "gantt_versions_contractId_isActive_idx" ON "gantt_versions"("contractId", "isActive");

-- FK для делегирования
DO $$ BEGIN
  ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_delegatedFromOrgId_fkey"
    FOREIGN KEY ("delegatedFromOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_delegatedToOrgId_fkey"
    FOREIGN KEY ("delegatedToOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_delegatedFromVersionId_fkey"
    FOREIGN KEY ("delegatedFromVersionId") REFERENCES "gantt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. КОЛОНКИ execution_docs — QR-код, режим хранения, классификация, штамп, XML
-- ─────────────────────────────────────────────────────────────────────────────

-- QR-код и режим хранения (Модуль 10)
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "qrToken" TEXT;
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "qrCodeS3Key" TEXT;
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "storageMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "storageModeAt" TIMESTAMP(3);
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "idCategory" "IdCategory";

-- Штамп производства работ
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "stampType" TEXT;
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "stampX" DOUBLE PRECISION;
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "stampY" DOUBLE PRECISION;
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "stampPage" INTEGER;
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "stampS3Key" TEXT;

-- XML-экспорт по схемам Минстроя
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "xmlExportedAt" TIMESTAMP(3);
ALTER TABLE "execution_docs" ADD COLUMN IF NOT EXISTS "xmlS3Key" TEXT;

-- Уникальный индекс для qrToken (UUID для публичной ссылки)
CREATE UNIQUE INDEX IF NOT EXISTS "execution_docs_qrToken_key" ON "execution_docs"("qrToken");

-- Индексы для новых полей
CREATE INDEX IF NOT EXISTS "execution_docs_lastEditedById_idx" ON "execution_docs"("lastEditedById");
CREATE INDEX IF NOT EXISTS "execution_docs_status_idx" ON "execution_docs"("status");

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. КОЛОНКА estimate_versions — статус пересчёта
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "estimate_versions" ADD COLUMN IF NOT EXISTS "status" "EstimateVersionStatus" NOT NULL DEFAULT 'OK';

CREATE INDEX IF NOT EXISTS "estimate_versions_parentVersionId_idx" ON "estimate_versions"("parentVersionId");
CREATE INDEX IF NOT EXISTS "estimate_versions_categoryId_idx" ON "estimate_versions"("categoryId");

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ТАБЛИЦА estimate_additional_costs — дополнительные начисления (НДС, НР, СП и т.д.)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "estimate_additional_costs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costType" "EstimateAdditionalCostType" NOT NULL,
    "applicationMode" "EstimateAdditionalCostApplicationMode" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "value" TEXT,
    "constructionWorks" TEXT,
    "mountingWorks" TEXT,
    "equipment" TEXT,
    "other" TEXT,
    "calculationMethod" "EstimateCalculationMethod" NOT NULL,
    "useCustomPrecision" BOOLEAN NOT NULL DEFAULT false,
    "precision" INTEGER,
    "versionId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_additional_costs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "estimate_additional_costs_versionId_idx" ON "estimate_additional_costs"("versionId");
CREATE INDEX IF NOT EXISTS "estimate_additional_costs_projectId_idx" ON "estimate_additional_costs"("projectId");

DO $$ BEGIN
  ALTER TABLE "estimate_additional_costs" ADD CONSTRAINT "estimate_additional_costs_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "estimate_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_additional_costs" ADD CONSTRAINT "estimate_additional_costs_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ТАБЛИЦА estimate_additional_cost_chapters — связь начисления с главой
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "estimate_additional_cost_chapters" (
    "id" TEXT NOT NULL,
    "additionalCostId" TEXT NOT NULL,
    "chapterName" TEXT NOT NULL,

    CONSTRAINT "estimate_additional_cost_chapters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "estimate_additional_cost_chapters_additionalCostId_idx" ON "estimate_additional_cost_chapters"("additionalCostId");

DO $$ BEGIN
  ALTER TABLE "estimate_additional_cost_chapters" ADD CONSTRAINT "estimate_additional_cost_chapters_additionalCostId_fkey"
    FOREIGN KEY ("additionalCostId") REFERENCES "estimate_additional_costs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ТАБЛИЦА estimate_additional_cost_estimates — связь начисления с версией сметы
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "estimate_additional_cost_estimates" (
    "id" TEXT NOT NULL,
    "additionalCostId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "estimate_additional_cost_estimates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "estimate_additional_cost_estimates_additionalCostId_idx" ON "estimate_additional_cost_estimates"("additionalCostId");
CREATE INDEX IF NOT EXISTS "estimate_additional_cost_estimates_versionId_idx" ON "estimate_additional_cost_estimates"("versionId");

DO $$ BEGIN
  ALTER TABLE "estimate_additional_cost_estimates" ADD CONSTRAINT "estimate_additional_cost_estimates_additionalCostId_fkey"
    FOREIGN KEY ("additionalCostId") REFERENCES "estimate_additional_costs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_additional_cost_estimates" ADD CONSTRAINT "estimate_additional_cost_estimates_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "estimate_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ТАБЛИЦА estimate_coefficients — коэффициенты пересчёта сметы
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "estimate_coefficients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "application" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "versionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_coefficients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "estimate_coefficients_versionId_idx" ON "estimate_coefficients"("versionId");

DO $$ BEGIN
  ALTER TABLE "estimate_coefficients" ADD CONSTRAINT "estimate_coefficients_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "estimate_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ТАБЛИЦА estimate_change_logs — история изменений версии сметы
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "estimate_change_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "versionId" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_change_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "estimate_change_logs_versionId_createdAt_idx" ON "estimate_change_logs"("versionId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "estimate_change_logs_userId_idx" ON "estimate_change_logs"("userId");

DO $$ BEGIN
  ALTER TABLE "estimate_change_logs" ADD CONSTRAINT "estimate_change_logs_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "estimate_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_change_logs" ADD CONSTRAINT "estimate_change_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ТАБЛИЦА gantt_task_exec_docs — связь задачи ГПР с исполнительным документом
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "gantt_task_exec_docs" (
    "ganttTaskId" TEXT NOT NULL,
    "execDocId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "gantt_task_exec_docs_pkey" PRIMARY KEY ("ganttTaskId", "execDocId")
);

CREATE INDEX IF NOT EXISTS "gantt_task_exec_docs_execDocId_idx" ON "gantt_task_exec_docs"("execDocId");

DO $$ BEGIN
  ALTER TABLE "gantt_task_exec_docs" ADD CONSTRAINT "gantt_task_exec_docs_ganttTaskId_fkey"
    FOREIGN KEY ("ganttTaskId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_task_exec_docs" ADD CONSTRAINT "gantt_task_exec_docs_execDocId_fkey"
    FOREIGN KEY ("execDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_task_exec_docs" ADD CONSTRAINT "gantt_task_exec_docs_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ТАБЛИЦА gantt_calendars — производственный календарь версии / задачи
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "gantt_calendars" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "workDays" JSONB NOT NULL,
    "workHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "holidays" JSONB NOT NULL DEFAULT '[]',
    "versionId" TEXT,
    "taskId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gantt_calendars_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gantt_calendars_versionId_idx" ON "gantt_calendars"("versionId");
CREATE INDEX IF NOT EXISTS "gantt_calendars_taskId_idx" ON "gantt_calendars"("taskId");
CREATE INDEX IF NOT EXISTS "gantt_calendars_projectId_idx" ON "gantt_calendars"("projectId");

DO $$ BEGIN
  ALTER TABLE "gantt_calendars" ADD CONSTRAINT "gantt_calendars_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "gantt_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_calendars" ADD CONSTRAINT "gantt_calendars_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_calendars" ADD CONSTRAINT "gantt_calendars_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. ТАБЛИЦА gantt_change_logs — журнал изменений ГПР (аудит)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "gantt_change_logs" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "taskId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gantt_change_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gantt_change_logs_versionId_idx" ON "gantt_change_logs"("versionId");
CREATE INDEX IF NOT EXISTS "gantt_change_logs_userId_idx" ON "gantt_change_logs"("userId");

DO $$ BEGIN
  ALTER TABLE "gantt_change_logs" ADD CONSTRAINT "gantt_change_logs_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "gantt_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gantt_change_logs" ADD CONSTRAINT "gantt_change_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
