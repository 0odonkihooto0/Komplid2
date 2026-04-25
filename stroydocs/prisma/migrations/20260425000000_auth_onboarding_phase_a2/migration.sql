-- AUTH_ONBOARDING_ROLES — Фаза A2
-- Расширение ролей, членств, фича-кодов.
--
-- Изменения:
--   1. Расширен enum WorkspaceRole: +MANAGER, +FOREMAN, +ENGINEER, +WORKER, +CUSTOMER
--   2. Добавлены enum'ы: UserAccountType, UserIntent, MemberStatus, FeatureCategory
--   3. Обновлена таблица users: поля онбординга и UTM-трекинга
--   4. Обновлена таблица workspace_members: статус, специализация, scope
--   5. Новые таблицы: subscription_features, plan_features
--
-- Все операции идемпотентны через IF NOT EXISTS / EXCEPTION WHEN.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. РАСШИРЕНИЕ WorkspaceRole
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'FOREMAN';
ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'ENGINEER';
ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'WORKER';
ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'CUSTOMER';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. НОВЫЕ ENUM-ТИПЫ
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE "UserAccountType" AS ENUM (
    'INDIVIDUAL', 'SELF_EMPLOYED', 'ENTREPRENEUR', 'LEGAL_ENTITY', 'UNKNOWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "UserIntent" AS ENUM (
    'CONTRACTOR_GENERAL', 'CONTRACTOR_SUB', 'CONTRACTOR_INDIVIDUAL',
    'ESTIMATOR', 'PTO_ENGINEER',
    'CUSTOMER_PRIVATE', 'CUSTOMER_B2B',
    'CONSTRUCTION_SUPERVISOR', 'UNKNOWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MemberStatus" AS ENUM (
    'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'LEFT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FeatureCategory" AS ENUM (
    'CORE', 'B2C_SMETCHIK', 'B2C_PTO', 'B2C_PRORAB', 'B2C_CUSTOMER',
    'B2B', 'AI', 'INTEGRATIONS', 'MARKETPLACE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ОБНОВЛЕНИЕ ТАБЛИЦЫ users
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "accountType" "UserAccountType" NOT NULL DEFAULT 'UNKNOWN';
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "intent" "UserIntent" NOT NULL DEFAULT 'UNKNOWN';
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "fullName" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "inn" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "onboardingStep" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "signupSource" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "referredByCode" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "utmSource" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "utmMedium" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "utmCampaign" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "utmContent" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "utmTerm" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "firstTouchAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "signupIpHash" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "signupUserAgent" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Индекс на referredByCode
CREATE INDEX IF NOT EXISTS "users_referredByCode_idx" ON "users"("referredByCode");

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ОБНОВЛЕНИЕ ТАБЛИЦЫ workspace_members
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD COLUMN "specialization" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD COLUMN "title" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD COLUMN "guestScope" JSONB;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD COLUMN "invitedBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD COLUMN "invitedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD COLUMN "acceptedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD COLUMN "lastActiveAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD COLUMN "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE';
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD COLUMN "deactivationReason" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Новые индексы (старый workspace_members_userId_idx оставляем для совместимости)
CREATE INDEX IF NOT EXISTS "workspace_members_userId_status_idx" ON "workspace_members"("userId", "status");
CREATE INDEX IF NOT EXISTS "workspace_members_workspaceId_role_idx" ON "workspace_members"("workspaceId", "role");

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ТАБЛИЦА subscription_features
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "subscription_features" (
  "id"           TEXT NOT NULL,
  "code"         TEXT NOT NULL,
  "displayName"  TEXT NOT NULL,
  "description"  TEXT,
  "category"     "FeatureCategory" NOT NULL,
  "isLimited"    BOOLEAN NOT NULL DEFAULT false,
  "defaultLimit" INTEGER,

  CONSTRAINT "subscription_features_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_features_code_key"
  ON "subscription_features"("code");

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ТАБЛИЦА plan_features
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "plan_features" (
  "id"        TEXT NOT NULL,
  "planId"    TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  "included"  BOOLEAN NOT NULL DEFAULT true,
  "limit"     INTEGER,

  CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "plan_features_planId_featureId_key"
  ON "plan_features"("planId", "featureId");

CREATE INDEX IF NOT EXISTS "plan_features_featureId_idx"
  ON "plan_features"("featureId");

-- FK: plan_features → subscription_plans
DO $$ BEGIN
  ALTER TABLE "plan_features"
    ADD CONSTRAINT "plan_features_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK: plan_features → subscription_features
DO $$ BEGIN
  ALTER TABLE "plan_features"
    ADD CONSTRAINT "plan_features_featureId_fkey"
    FOREIGN KEY ("featureId") REFERENCES "subscription_features"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
