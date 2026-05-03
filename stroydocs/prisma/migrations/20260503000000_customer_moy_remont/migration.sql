-- Модуль 17 Фаза 3: B2C «Мой Ремонт»
-- Идемпотентная миграция: CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS

-- Добавляем CUSTOMER в ProfiRole
DO $$ BEGIN
  ALTER TYPE "ProfiRole" ADD VALUE IF NOT EXISTS 'CUSTOMER';
EXCEPTION WHEN others THEN NULL;
END $$;

-- Новые enum-типы
DO $$ BEGIN
  CREATE TYPE "HiddenWorkType" AS ENUM (
    'FOUNDATION','WATERPROOFING','REINFORCEMENT','CONCRETE_WORKS',
    'INSULATION','ELECTRICAL','PLUMBING','VENTILATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChecklistStatus" AS ENUM (
    'PENDING','IN_PROGRESS','REQUIRES_PHOTO','COMPLETED','DISPUTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerPaymentCategory" AS ENUM (
    'ADVANCE','STAGE_PAYMENT','FINAL_PAYMENT','MATERIALS','ADDITIONAL_WORKS','OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClaimStatus" AS ENUM (
    'DRAFT','SENT','ACKNOWLEDGED','UNDER_REVIEW','RESOLVED','REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClaimType" AS ENUM (
    'QUALITY_ISSUE','DELAY','OVERBILLING','MISSING_DOCUMENTS',
    'WARRANTY_VIOLATION','PRE_COURT','CONTRACT_TERMINATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Чек-листы скрытых работ
CREATE TABLE IF NOT EXISTS "hidden_works_checklists" (
  "id"          TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "workType"    "HiddenWorkType" NOT NULL,
  "title"       TEXT NOT NULL,
  "status"      "ChecklistStatus" NOT NULL DEFAULT 'PENDING',
  "notes"       TEXT,
  "completedAt" TIMESTAMP(3),
  "photoUrl"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hidden_works_checklists_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hidden_works_checklists_workspaceId_idx" ON "hidden_works_checklists"("workspaceId");
CREATE INDEX IF NOT EXISTS "hidden_works_checklists_projectId_idx" ON "hidden_works_checklists"("projectId");

DO $$ BEGIN
  ALTER TABLE "hidden_works_checklists"
    ADD CONSTRAINT "hidden_works_checklists_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "hidden_works_checklists"
    ADD CONSTRAINT "hidden_works_checklists_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Пункты чек-листов
CREATE TABLE IF NOT EXISTS "checklist_items" (
  "id"          TEXT NOT NULL,
  "checklistId" TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "isRequired"  BOOLEAN NOT NULL DEFAULT false,
  "isChecked"   BOOLEAN NOT NULL DEFAULT false,
  "checkedAt"   TIMESTAMP(3),
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "checklist_items_checklistId_idx" ON "checklist_items"("checklistId");

DO $$ BEGIN
  ALTER TABLE "checklist_items"
    ADD CONSTRAINT "checklist_items_checklistId_fkey"
    FOREIGN KEY ("checklistId") REFERENCES "hidden_works_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Трекер оплат
CREATE TABLE IF NOT EXISTS "customer_payments" (
  "id"          TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "category"    "CustomerPaymentCategory" NOT NULL,
  "amountRub"   INTEGER NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "contractRef" TEXT,
  "receiptUrl"  TEXT,
  "isPaid"      BOOLEAN NOT NULL DEFAULT false,
  "paidAt"      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_payments_workspaceId_idx" ON "customer_payments"("workspaceId");
CREATE INDEX IF NOT EXISTS "customer_payments_projectId_idx" ON "customer_payments"("projectId");

DO $$ BEGIN
  ALTER TABLE "customer_payments"
    ADD CONSTRAINT "customer_payments_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "customer_payments"
    ADD CONSTRAINT "customer_payments_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Трекер материалов
CREATE TABLE IF NOT EXISTS "customer_materials" (
  "id"          TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "unit"        TEXT NOT NULL,
  "quantity"    DOUBLE PRECISION NOT NULL,
  "priceRub"    INTEGER NOT NULL,
  "totalRub"    INTEGER NOT NULL,
  "supplier"    TEXT,
  "deliveredAt" TIMESTAMP(3),
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_materials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_materials_workspaceId_idx" ON "customer_materials"("workspaceId");
CREATE INDEX IF NOT EXISTS "customer_materials_projectId_idx" ON "customer_materials"("projectId");

DO $$ BEGIN
  ALTER TABLE "customer_materials"
    ADD CONSTRAINT "customer_materials_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "customer_materials"
    ADD CONSTRAINT "customer_materials_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Претензии
CREATE TABLE IF NOT EXISTS "customer_claims" (
  "id"            TEXT NOT NULL,
  "workspaceId"   TEXT NOT NULL,
  "projectId"     TEXT NOT NULL,
  "type"          "ClaimType" NOT NULL,
  "status"        "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
  "title"         TEXT NOT NULL,
  "content"       TEXT NOT NULL,
  "recipientName" TEXT,
  "sentAt"        TIMESTAMP(3),
  "resolvedAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_claims_workspaceId_idx" ON "customer_claims"("workspaceId");
CREATE INDEX IF NOT EXISTS "customer_claims_projectId_idx" ON "customer_claims"("projectId");

DO $$ BEGIN
  ALTER TABLE "customer_claims"
    ADD CONSTRAINT "customer_claims_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "customer_claims"
    ADD CONSTRAINT "customer_claims_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- История диалога с AI-юристом
CREATE TABLE IF NOT EXISTS "lawyer_conversations" (
  "id"          TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "role"        TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lawyer_conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lawyer_conversations_workspaceId_userId_createdAt_idx"
  ON "lawyer_conversations"("workspaceId", "userId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "lawyer_conversations"
    ADD CONSTRAINT "lawyer_conversations_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lawyer_conversations"
    ADD CONSTRAINT "lawyer_conversations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
