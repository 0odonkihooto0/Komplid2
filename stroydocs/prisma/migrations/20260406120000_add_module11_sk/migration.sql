-- ============================================================
-- Модуль 11 — Строительный контроль (СК)
-- Новые enum-ы, таблицы, расширение defects
-- ============================================================

-- Enum: статус проверки
CREATE TYPE "InspectionStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- Enum: тип предписания
CREATE TYPE "PrescriptionType" AS ENUM ('DEFECT_ELIMINATION', 'WORK_SUSPENSION');

-- Enum: статус предписания
CREATE TYPE "PrescriptionStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- Enum: статус акта устранения недостатков
CREATE TYPE "RemediationActStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACCEPTED', 'REJECTED');

-- Enum: тип инструктажа по ОТиТБ
CREATE TYPE "SafetyBriefingType" AS ENUM ('INTRODUCTORY', 'PRIMARY', 'TARGETED', 'REPEATED', 'UNSCHEDULED');

-- Таблица: Проверки строительного контроля
CREATE TABLE "inspections" (
    "id"               TEXT NOT NULL,
    "number"           TEXT NOT NULL,
    "status"           "InspectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"      TIMESTAMP(3),
    "comment"          TEXT,
    "inspectorId"      TEXT NOT NULL,
    "inspectorOrgId"   TEXT,
    "responsibleId"    TEXT,
    "responsibleOrgId" TEXT,
    "contractorPresent" BOOLEAN,
    "attentionUserId"  TEXT,
    "ganttTaskIds"     TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectId"        TEXT NOT NULL,
    "createdById"      TEXT NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- Таблица: Акты проверок
CREATE TABLE "inspection_acts" (
    "id"              TEXT NOT NULL,
    "number"          TEXT NOT NULL,
    "issuedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "s3Key"           TEXT,
    "fileName"        TEXT,
    "inspectionId"    TEXT NOT NULL,
    "issuedById"      TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inspection_acts_pkey" PRIMARY KEY ("id")
);

-- Таблица: Предписания
CREATE TABLE "prescriptions" (
    "id"              TEXT NOT NULL,
    "number"          TEXT NOT NULL,
    "type"            "PrescriptionType" NOT NULL,
    "status"          "PrescriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline"        TIMESTAMP(3),
    "closedAt"        TIMESTAMP(3),
    "s3Key"           TEXT,
    "fileName"        TEXT,
    "inspectionId"    TEXT NOT NULL,
    "issuedById"      TEXT NOT NULL,
    "responsibleId"   TEXT,
    "approvalRouteId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- Таблица: Акты устранения недостатков
CREATE TABLE "defect_remediation_acts" (
    "id"                 TEXT NOT NULL,
    "number"             TEXT NOT NULL,
    "status"             "RemediationActStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "s3Key"              TEXT,
    "fileName"           TEXT,
    "inspectionId"       TEXT NOT NULL,
    "prescriptionId"     TEXT NOT NULL,
    "defectIds"          TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remediationDetails" JSONB,
    "issuedById"         TEXT NOT NULL,
    "approvalRouteId"    TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    CONSTRAINT "defect_remediation_acts_pkey" PRIMARY KEY ("id")
);

-- Таблица: Инструктажи по ОТиТБ
CREATE TABLE "safety_briefings" (
    "id"            TEXT NOT NULL,
    "type"          "SafetyBriefingType" NOT NULL,
    "date"          TIMESTAMP(3) NOT NULL,
    "topic"         TEXT NOT NULL,
    "notes"         TEXT,
    "conductedById" TEXT NOT NULL,
    "projectId"     TEXT NOT NULL,
    "participants"  JSONB,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "safety_briefings_pkey" PRIMARY KEY ("id")
);

-- Расширение таблицы defects (Модуль 11)
ALTER TABLE "defects" ADD COLUMN IF NOT EXISTS "requiresSuspension" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "defects" ADD COLUMN IF NOT EXISTS "inspectionId"       TEXT;
ALTER TABLE "defects" ADD COLUMN IF NOT EXISTS "prescriptionId"     TEXT;
ALTER TABLE "defects" ADD COLUMN IF NOT EXISTS "deputyInspectorId"  TEXT;

-- Индексы: inspections
CREATE INDEX "inspections_projectId_idx" ON "inspections"("projectId");
CREATE INDEX "inspections_status_idx"    ON "inspections"("status");

-- Индексы: inspection_acts
CREATE INDEX "inspection_acts_inspectionId_idx" ON "inspection_acts"("inspectionId");
CREATE UNIQUE INDEX "inspection_acts_approvalRouteId_key" ON "inspection_acts"("approvalRouteId");

-- Индексы: prescriptions
CREATE INDEX "prescriptions_inspectionId_idx" ON "prescriptions"("inspectionId");
CREATE INDEX "prescriptions_status_idx"       ON "prescriptions"("status");
CREATE UNIQUE INDEX "prescriptions_approvalRouteId_key" ON "prescriptions"("approvalRouteId");

-- Индексы: defect_remediation_acts
CREATE INDEX "defect_remediation_acts_inspectionId_idx"   ON "defect_remediation_acts"("inspectionId");
CREATE INDEX "defect_remediation_acts_prescriptionId_idx" ON "defect_remediation_acts"("prescriptionId");
CREATE UNIQUE INDEX "defect_remediation_acts_approvalRouteId_key" ON "defect_remediation_acts"("approvalRouteId");

-- Индексы: safety_briefings
CREATE INDEX "safety_briefings_projectId_idx" ON "safety_briefings"("projectId");

-- Индексы: defects (новые поля)
CREATE INDEX "defects_inspectionId_idx" ON "defects"("inspectionId");

-- FK: inspections
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_projectId_fkey"    FOREIGN KEY ("projectId")    REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspectorId_fkey"  FOREIGN KEY ("inspectorId")  REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_createdById_fkey"   FOREIGN KEY ("createdById")  REFERENCES "users"("id") ON UPDATE CASCADE;

-- FK: inspection_acts
ALTER TABLE "inspection_acts" ADD CONSTRAINT "inspection_acts_inspectionId_fkey"    FOREIGN KEY ("inspectionId")    REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_acts" ADD CONSTRAINT "inspection_acts_issuedById_fkey"       FOREIGN KEY ("issuedById")       REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "inspection_acts" ADD CONSTRAINT "inspection_acts_approvalRouteId_fkey"  FOREIGN KEY ("approvalRouteId")  REFERENCES "approval_routes"("id") ON UPDATE CASCADE;

-- FK: prescriptions
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_inspectionId_fkey"    FOREIGN KEY ("inspectionId")    REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_issuedById_fkey"       FOREIGN KEY ("issuedById")       REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_responsibleId_fkey"    FOREIGN KEY ("responsibleId")    REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_approvalRouteId_fkey"  FOREIGN KEY ("approvalRouteId")  REFERENCES "approval_routes"("id") ON UPDATE CASCADE;

-- FK: defect_remediation_acts
ALTER TABLE "defect_remediation_acts" ADD CONSTRAINT "defect_remediation_acts_inspectionId_fkey"    FOREIGN KEY ("inspectionId")    REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "defect_remediation_acts" ADD CONSTRAINT "defect_remediation_acts_prescriptionId_fkey"  FOREIGN KEY ("prescriptionId")  REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "defect_remediation_acts" ADD CONSTRAINT "defect_remediation_acts_issuedById_fkey"      FOREIGN KEY ("issuedById")      REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "defect_remediation_acts" ADD CONSTRAINT "defect_remediation_acts_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON UPDATE CASCADE;

-- FK: safety_briefings
ALTER TABLE "safety_briefings" ADD CONSTRAINT "safety_briefings_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "safety_briefings" ADD CONSTRAINT "safety_briefings_projectId_fkey"     FOREIGN KEY ("projectId")     REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: defects (новые поля)
ALTER TABLE "defects" ADD CONSTRAINT "defects_inspectionId_fkey"   FOREIGN KEY ("inspectionId")   REFERENCES "inspections"("id") ON UPDATE CASCADE;
ALTER TABLE "defects" ADD CONSTRAINT "defects_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON UPDATE CASCADE;
