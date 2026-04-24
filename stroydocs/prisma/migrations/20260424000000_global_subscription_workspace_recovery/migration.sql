-- Глобальная финальная идемпотентная миграция восстановления
-- Workspace-системы и Subscription-системы (Модуль 15).
--
-- Контекст сбоя (2026-04-24):
--   Каскад: #010000 падает на ALTER TABLE "workspaces" (таблица создаётся
--   позже в #060000). Rollback сносит enums PlanType/ProfessionalRole/
--   SubscriptionStatus и таблицы subscription_plans/subscriptions/payments.
--   #060000 падает на ADD COLUMN "users.professionalRole" типа
--   "ProfessionalRole" (DO-блок ловил только duplicate_column, не
--   undefined_object) → rollback → workspaces не создан.
--   #22020000 падает на ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS
--   — IF NOT EXISTS относится к колонке, не к таблице.
--   #23000000 падает на том же ADD COLUMN professionalRole.
--   start.sh помечал всё как applied без фактического выполнения SQL.
--   Результат: users.activeWorkspaceId отсутствует → P2022 на каждом
--   запросе NextAuth.
--
-- Стратегия: одна транзакция, каждый шаг идемпотентен, порядок строго
-- dependency-safe. Выполняется ВНЕ зависимости от состояния прошлых
-- миграций. После выполнения БД гарантированно соответствует schema.prisma.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ENUM-ТИПЫ (создаются ПЕРЕД любыми таблицами/колонками, которые их
--    используют). Все через DO $$ ... EXCEPTION WHEN duplicate_object.
-- ═══════════════════════════════════════════════════════════════════════════

-- Workspace
DO $$ BEGIN CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'COMPANY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subscription базовые
DO $$ BEGIN CREATE TYPE "PlanType" AS ENUM ('FREE', 'SOLO_BASIC', 'SOLO_PRO', 'TEAM', 'CORPORATE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ProfessionalRole" AS ENUM (
  'SMETCHIK', 'PTO', 'FOREMAN', 'SK_INSPECTOR',
  'SUPPLIER', 'PROJECT_MANAGER', 'ACCOUNTANT'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM (
  'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'INCOMPLETE'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIALING';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'GRACE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

DO $$ BEGIN CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "PaymentSource" AS ENUM ('APP', 'TILDA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'MARKETING';
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'API';
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'WEBHOOK';

DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ТАБЛИЦЫ WORKSPACE (создаются ПЕРЕД subscription, тк FK workspaces→sub
--    и sub→workspaces требуют обе таблицы; порядок: workspaces →
--    subscription_plans → subscriptions → payments)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "workspaces" (
    "id"                   TEXT NOT NULL,
    "type"                 "WorkspaceType" NOT NULL,
    "name"                 TEXT NOT NULL,
    "slug"                 TEXT NOT NULL,
    "organizationId"       TEXT,
    "ownerId"              TEXT NOT NULL,
    "activeSubscriptionId" TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_key"
    ON "workspaces"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_organizationId_key"
    ON "workspaces"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_activeSubscriptionId_key"
    ON "workspaces"("activeSubscriptionId");

CREATE TABLE IF NOT EXISTS "workspace_members" (
    "id"          TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "role"        "WorkspaceRole" NOT NULL,
    "joinedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspaceId_userId_key"
    ON "workspace_members"("workspaceId", "userId");
CREATE INDEX IF NOT EXISTS "workspace_members_userId_idx"
    ON "workspace_members"("userId");

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ТАБЛИЦЫ SUBSCRIPTION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id"                        TEXT         NOT NULL,
    "code"                      TEXT         NOT NULL,
    "name"                      TEXT         NOT NULL,
    "description"               TEXT,
    "planType"                  "PlanType"   NOT NULL,
    "targetRole"                "ProfessionalRole",
    "requiresPersonalWorkspace" BOOLEAN      NOT NULL DEFAULT false,
    "priceMonthlyRub"           INTEGER      NOT NULL,
    "priceYearlyRub"            INTEGER      NOT NULL,
    "features"                  JSONB        NOT NULL DEFAULT '[]',
    "limits"                    JSONB        NOT NULL DEFAULT '{}',
    "isActive"                  BOOLEAN      NOT NULL DEFAULT true,
    "isFeatured"                BOOLEAN      NOT NULL DEFAULT false,
    "displayOrder"              INTEGER      NOT NULL DEFAULT 0,
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key"
    ON "subscription_plans"("code");

-- Если таблица ранее создавалась со старой схемой features TEXT[] — конвертим в JSONB
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans'
      AND column_name = 'features'
      AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE "subscription_plans" DROP COLUMN "features";
    ALTER TABLE "subscription_plans" ADD COLUMN "features" JSONB NOT NULL DEFAULT '[]';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id"                     TEXT                 NOT NULL,
    "workspaceId"            TEXT                 NOT NULL,
    "planId"                 TEXT                 NOT NULL,
    "status"                 "SubscriptionStatus" NOT NULL,
    "billingPeriod"          "BillingPeriod"      NOT NULL,
    "currentPeriodStart"     TIMESTAMP(3)         NOT NULL,
    "currentPeriodEnd"       TIMESTAMP(3)         NOT NULL,
    "cancelAtPeriodEnd"      BOOLEAN              NOT NULL DEFAULT false,
    "canceledAt"             TIMESTAMP(3),
    "trialEnd"               TIMESTAMP(3),
    "yookassaSubscriptionId" TEXT,
    "createdAt"              TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3)         NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_yookassaSubscriptionId_key"
    ON "subscriptions"("yookassaSubscriptionId");
CREATE INDEX IF NOT EXISTS "subscriptions_workspaceId_idx"
    ON "subscriptions"("workspaceId");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx"
    ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_currentPeriodEnd_idx"
    ON "subscriptions"("currentPeriodEnd");

CREATE TABLE IF NOT EXISTS "payments" (
    "id"                      TEXT            NOT NULL,
    "subscriptionId"          TEXT,
    "workspaceId"             TEXT            NOT NULL,
    "userId"                  TEXT            NOT NULL,
    "source"                  "PaymentSource" NOT NULL,
    "status"                  "PaymentStatus" NOT NULL,
    "amountRub"               INTEGER         NOT NULL,
    "currency"                TEXT            NOT NULL DEFAULT 'RUB',
    "yookassaPaymentId"       TEXT,
    "yookassaIdempotencyKey"  TEXT,
    "referralCreditApplied"   INTEGER         NOT NULL DEFAULT 0,
    "referralDiscountApplied" INTEGER         NOT NULL DEFAULT 0,
    "referralId"              TEXT,
    "paidAt"                  TIMESTAMP(3),
    "failedAt"                TIMESTAMP(3),
    "refundedAt"              TIMESTAMP(3),
    "failureReason"           TEXT,
    "createdAt"               TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_yookassaPaymentId_key"
    ON "payments"("yookassaPaymentId");
CREATE INDEX IF NOT EXISTS "payments_workspaceId_idx"
    ON "payments"("workspaceId");
CREATE INDEX IF NOT EXISTS "payments_status_idx"
    ON "payments"("status");

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. КОЛОНКИ В users И building_objects (после того как все типы точно есть)
--    ГЛАВНОЕ ИСПРАВЛЕНИЕ: users.activeWorkspaceId
-- ═══════════════════════════════════════════════════════════════════════════

-- activeWorkspaceId — TEXT, не enum, потому IF NOT EXISTS достаточно
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activeWorkspaceId" TEXT;

-- professionalRole — enum, ловим duplicate_column И undefined_object
-- (если тип ProfessionalRole не создался выше по какой-то причине)
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "professionalRole" "ProfessionalRole";
EXCEPTION
  WHEN duplicate_column THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- workspaceId на объектах строительства
ALTER TABLE "building_objects" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "building_objects_workspaceId_idx"
    ON "building_objects"("workspaceId");

-- activeSubscriptionId на workspaces (тут workspaces уже существует — создан в шаге 2)
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "activeSubscriptionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_activeSubscriptionId_key_v2"
    ON "workspaces"("activeSubscriptionId");

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. FOREIGN KEY CONSTRAINTS (в конце, когда все таблицы и колонки на месте)
-- ═══════════════════════════════════════════════════════════════════════════

-- Workspace FK
DO $$ BEGIN
  ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "building_objects" ADD CONSTRAINT "building_objects_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subscription FK (subscriptions ↔ workspaces, subscriptions ↔ plans)
DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_activeSubscriptionId_fkey"
    FOREIGN KEY ("activeSubscriptionId") REFERENCES "subscriptions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payments FK
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
