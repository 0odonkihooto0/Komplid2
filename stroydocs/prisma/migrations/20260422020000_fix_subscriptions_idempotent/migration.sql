-- Идемпотентное исправление всей системы подписок, реферальной программы
-- и расширенного биллинга.
--
-- Причина cascade-отказа:
--   20260421010000_add_subscriptions_payments выполняет
--   ALTER TABLE "workspaces" ADD COLUMN ... ПРЕЖДЕ чем workspaces создана
--   (workspaces создаётся позже в 20260421060000). PostgreSQL откатывает
--   всю транзакцию → PlanType, ProfessionalRole, subscription_plans,
--   subscriptions, payments — все откатываются.
--   Следствие: 20260421030000 падает (нет ProfessionalRole),
--              20260421070000 падает (нет SubscriptionStatus/subscription_plans).
--   check-migration-integrity.js детектирует отсутствие subscription_plans →
--   TRUNCATE _prisma_migrations → бесконечный цикл.
--
-- Эта миграция гарантирует существование ВСЕХ объектов подписочной и
-- реферальной системы независимо от состояния БД.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ENUMS (из 010000, 030000 и 070000 — с включением расширенных значений)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE "PlanType" AS ENUM ('FREE', 'SOLO_BASIC', 'SOLO_PRO', 'TEAM', 'CORPORATE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProfessionalRole" AS ENUM (
    'SMETCHIK', 'PTO', 'FOREMAN', 'SK_INSPECTOR',
    'SUPPLIER', 'PROJECT_MANAGER', 'ACCOUNTANT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SubscriptionStatus: значения из 010000 + расширения из 070000
DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM (
    'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'INCOMPLETE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIALING';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'GRACE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

DO $$ BEGIN
  CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PaymentSource: значения из 010000 + расширения из 070000
DO $$ BEGIN
  CREATE TYPE "PaymentSource" AS ENUM ('APP', 'TILDA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'MARKETING';
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'API';
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'WEBHOOK';

-- PaymentStatus: значения из 010000 + расширения из 070000
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_CAPTURE';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'AUTHORIZED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

-- Новые enums из 070000
DO $$ BEGIN
  CREATE TYPE "PlanCategory" AS ENUM ('FREEMIUM', 'B2C', 'B2B', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProfiRole" AS ENUM ('SMETCHIK', 'PTO', 'PRORAB');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CancellationReasonCode" AS ENUM (
    'TOO_EXPENSIVE', 'MISSING_FEATURES', 'COMPETITOR', 'NOT_USING',
    'TECHNICAL_ISSUES', 'TEMPORARY', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentType" AS ENUM (
    'PLAN_PAYMENT', 'PLAN_RENEWAL', 'PLAN_UPGRADE', 'PLAN_PRORATION',
    'CREDIT_TOPUP', 'REFUND', 'MANUAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('YOOKASSA', 'TINKOFF', 'SBERBANK', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethodType" AS ENUM (
    'BANK_CARD', 'SBP', 'YOOMONEY', 'SBERPAY', 'TPAY', 'YANDEX_PAY', 'INVOICE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionEventType" AS ENUM (
    'CREATED', 'TRIAL_STARTED', 'TRIAL_ENDED', 'TRIAL_CONVERTED',
    'RENEWED', 'RENEWAL_FAILED', 'UPGRADED', 'DOWNGRADED',
    'PLAN_CHANGE_SCHEDULED', 'CANCELLED', 'REACTIVATED', 'EXPIRED',
    'GRACE_STARTED', 'GRACE_EXPIRED', 'PAUSED', 'RESUMED',
    'PAYMENT_METHOD_CHANGED', 'DUNNING_START', 'DUNNING_RESOLVED',
    'DUNNING_FAILED', 'PROMO_APPLIED', 'MANUAL_EXTENSION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'ADMIN', 'WEBHOOK', 'API');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReceiptType" AS ENUM (
    'PAYMENT', 'PREPAYMENT', 'FULL_PAYMENT', 'REFUND', 'CREDIT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReceiptProvider" AS ENUM (
    'YOOKASSA', 'EVOTOR_CLOUD', 'ATOL_ONLINE', 'NONE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReceiptStatus" AS ENUM (
    'PENDING', 'SUBMITTED', 'REGISTERED', 'FAILED', 'RETRY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM (
    'DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM (
    'PERCENT', 'FIXED_AMOUNT', 'TRIAL_DAYS', 'FREE_MONTHS'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DunningResult" AS ENUM (
    'SUCCESS', 'FAILED', 'CARD_EXPIRED', 'USER_CANCELLED', 'USER_UPDATED_CARD'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "UserDunningAction" AS ENUM (
    'UPDATED_PAYMENT_METHOD', 'CANCELLED_SUBSCRIPTION', 'IGNORED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enums реферальной программы (из 030000)
DO $$ BEGIN
  CREATE TYPE "RewardType" AS ENUM ('CREDIT', 'CASHBACK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'GRANTED', 'PAID', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerEntryType" AS ENUM (
    'REFERRAL_BONUS', 'PAYMENT_DEDUCTION', 'MANUAL_ADJUSTMENT', 'REFUND'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ТАБЛИЦА subscription_plans (финальная схема: base + extended из 070000)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id"                      TEXT        NOT NULL,
    "code"                    TEXT        NOT NULL,
    "name"                    TEXT        NOT NULL,
    "description"             TEXT,
    "planType"                "PlanType"  NOT NULL,
    "targetRole"              "ProfessionalRole",
    "requiresPersonalWorkspace" BOOLEAN   NOT NULL DEFAULT false,
    "priceMonthlyRub"         INTEGER     NOT NULL,
    "priceYearlyRub"          INTEGER     NOT NULL,
    "features"                JSONB       NOT NULL DEFAULT '[]',
    "limits"                  JSONB       NOT NULL DEFAULT '{}',
    "isActive"                BOOLEAN     NOT NULL DEFAULT true,
    "isFeatured"              BOOLEAN     NOT NULL DEFAULT false,
    "displayOrder"            INTEGER     NOT NULL DEFAULT 0,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key"
      ON "subscription_plans"("code");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Если таблица уже существовала с features TEXT[], конвертируем в JSONB
DO $$
BEGIN
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

-- Extended columns из 070000
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "category"                   "PlanCategory";
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "profiRole"                  "ProfiRole";
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "billingPeriod"              "BillingPeriod";
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "priceRub"                   INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "oldPriceRub"                INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "currency"                   TEXT NOT NULL DEFAULT 'RUB';
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "maxObjects"                 INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "maxUsers"                   INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "maxGuests"                  INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "maxStorageGb"               INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "maxEstimatesPerMonth"       INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "maxAosrPerMonth"            INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "maxActiveObjects"           INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "maxJournalEntriesPerMonth"  INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "maxPublicLinksActive"       INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "trialDays"                  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "trialFeatures"              JSONB;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "isPopular"                  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "isVisible"                  BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "isLegacy"                   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "metadata"                   JSONB;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "subscription_plans_category_profiRole_idx"
      ON "subscription_plans"("category", "profiRole");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ТАБЛИЦА subscriptions
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id"                     TEXT               NOT NULL,
    "workspaceId"            TEXT               NOT NULL,
    "planId"                 TEXT               NOT NULL,
    "status"                 "SubscriptionStatus" NOT NULL,
    "billingPeriod"          "BillingPeriod"    NOT NULL,
    "currentPeriodStart"     TIMESTAMP(3)       NOT NULL,
    "currentPeriodEnd"       TIMESTAMP(3)       NOT NULL,
    "cancelAtPeriodEnd"      BOOLEAN            NOT NULL DEFAULT false,
    "canceledAt"             TIMESTAMP(3),
    "trialEnd"               TIMESTAMP(3),
    "yookassaSubscriptionId" TEXT,
    "createdAt"              TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3)       NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_yookassaSubscriptionId_key"
      ON "subscriptions"("yookassaSubscriptionId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "subscriptions_workspaceId_status_idx"
      ON "subscriptions"("workspaceId", "status");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "subscriptions_status_currentPeriodEnd_idx"
      ON "subscriptions"("status", "currentPeriodEnd");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Extended columns из 070000
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "startedAt"              TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "trialStart"             TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancelReason"           "CancellationReasonCode";
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancelFeedback"         TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "effectiveEndDate"       TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pendingPlanId"          TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pendingPlanChangeAt"    TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "autoRenew"              BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "defaultPaymentMethodId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "graceUntil"             TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "dunningAttempts"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "nextDunningAt"          TIMESTAMP(3);
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "subscriptions_status_graceUntil_idx"
      ON "subscriptions"("status", "graceUntil");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "subscriptions_status_nextDunningAt_idx"
      ON "subscriptions"("status", "nextDunningAt");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ТАБЛИЦА payments
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "payments" (
    "id"                     TEXT           NOT NULL,
    "subscriptionId"         TEXT,
    "workspaceId"            TEXT           NOT NULL,
    "userId"                 TEXT           NOT NULL,
    "source"                 "PaymentSource" NOT NULL,
    "status"                 "PaymentStatus" NOT NULL,
    "amountRub"              INTEGER        NOT NULL,
    "currency"               TEXT           NOT NULL DEFAULT 'RUB',
    "yookassaPaymentId"      TEXT,
    "yookassaIdempotencyKey" TEXT,
    "referralCreditApplied"  INTEGER        NOT NULL DEFAULT 0,
    "referralDiscountApplied" INTEGER       NOT NULL DEFAULT 0,
    "referralId"             TEXT,
    "paidAt"                 TIMESTAMP(3),
    "failedAt"               TIMESTAMP(3),
    "refundedAt"             TIMESTAMP(3),
    "failureReason"          TEXT,
    "createdAt"              TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "payments_yookassaPaymentId_key"
      ON "payments"("yookassaPaymentId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "payments_workspaceId_createdAt_idx"
      ON "payments"("workspaceId", "createdAt" DESC);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "payments_subscriptionId_idx"
      ON "payments"("subscriptionId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "payments_status_createdAt_idx"
      ON "payments"("status", "createdAt");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Extended columns из 070000
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "type"                   "PaymentType";
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "billingPeriod"          "BillingPeriod";
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "description"            TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "metadata"               JSONB;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider"               "PaymentProvider" NOT NULL DEFAULT 'YOOKASSA';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "providerPaymentId"      TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "providerIdempotenceKey" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "providerMetadata"       JSONB;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "requiresCapture"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "capturedAt"             TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "confirmationUrl"        TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paymentMethodId"        TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "savePaymentMethod"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paymentMethodSnapshot"  JSONB;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "promoCodeId"            TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "discountRub"            INTEGER;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "originalAmountRub"      INTEGER;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refundedAmountRub"      INTEGER;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refundReason"           TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoiceId"              TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receiptId"              TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "ipAddress"              TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "userAgent"              TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "updatedAt"              TIMESTAMP(3);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "payments_providerPaymentId_key"
      ON "payments"("providerPaymentId") WHERE "providerPaymentId" IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. КОЛОНКИ В workspaces И users
-- ═══════════════════════════════════════════════════════════════════════════

-- workspaces может отсутствовать если #060000 откатился — защищаем undefined_table
DO $$ BEGIN
  ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "activeSubscriptionId" TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_activeSubscriptionId_key"
      ON "workspaces"("activeSubscriptionId");
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;
-- ProfessionalRole точно создан выше (в блоке 1 этой же миграции),
-- но на всякий случай защищаем undefined_object
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "professionalRole" "ProfessionalRole";
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. НОВЫЕ ТАБЛИЦЫ РАСШИРЕННОГО БИЛЛИНГА (из 070000)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "payment_methods" (
    "id"                     TEXT               NOT NULL,
    "workspaceId"            TEXT               NOT NULL,
    "provider"               "PaymentProvider"  NOT NULL DEFAULT 'YOOKASSA',
    "providerMethodId"       TEXT               NOT NULL,
    "type"                   "PaymentMethodType" NOT NULL,
    "cardBrand"              TEXT,
    "cardLast4"              TEXT,
    "cardExpiryMonth"        INTEGER,
    "cardExpiryYear"         INTEGER,
    "accountTitle"           TEXT,
    "isActive"               BOOLEAN            NOT NULL DEFAULT true,
    "deactivatedAt"          TIMESTAMP(3),
    "deactivationReason"     TEXT,
    "isDefault"              BOOLEAN            NOT NULL DEFAULT false,
    "lastUsedAt"             TIMESTAMP(3),
    "successfulChargesCount" INTEGER            NOT NULL DEFAULT 0,
    "failedChargesCount"     INTEGER            NOT NULL DEFAULT 0,
    "createdAt"              TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3)       NOT NULL,
    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_workspaceId_providerMethodId_key"
      ON "payment_methods"("workspaceId", "providerMethodId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "payment_methods_workspaceId_isActive_idx"
      ON "payment_methods"("workspaceId", "isActive");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "subscription_events" (
    "id"             TEXT                   NOT NULL,
    "subscriptionId" TEXT                   NOT NULL,
    "type"           "SubscriptionEventType" NOT NULL,
    "payload"        JSONB                  NOT NULL,
    "actorType"      "ActorType"            NOT NULL,
    "actorUserId"    TEXT,
    "createdAt"      TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "subscription_events_subscriptionId_createdAt_idx"
      ON "subscription_events"("subscriptionId", "createdAt" DESC);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "subscription_events_type_createdAt_idx"
      ON "subscription_events"("type", "createdAt");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "receipts" (
    "id"                      TEXT             NOT NULL,
    "workspaceId"             TEXT             NOT NULL,
    "subscriptionId"          TEXT,
    "type"                    "ReceiptType"    NOT NULL,
    "customerEmail"           TEXT             NOT NULL,
    "customerPhone"           TEXT,
    "customerInn"             TEXT,
    "items"                   JSONB            NOT NULL,
    "totalRub"                INTEGER          NOT NULL,
    "vatRub"                  INTEGER          NOT NULL DEFAULT 0,
    "provider"                "ReceiptProvider" NOT NULL DEFAULT 'YOOKASSA',
    "providerReceiptId"       TEXT,
    "ofdUrl"                  TEXT,
    "ofdPdfUrl"               TEXT,
    "status"                  "ReceiptStatus"  NOT NULL,
    "statusChangedAt"         TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage"            TEXT,
    "fiscalDocumentNumber"    TEXT,
    "fiscalDocumentAttribute" TEXT,
    "fiscalDriveNumber"       TEXT,
    "registeredAt"            TIMESTAMP(3),
    "createdAt"               TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "receipts_providerReceiptId_key"
      ON "receipts"("providerReceiptId") WHERE "providerReceiptId" IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "receipts_workspaceId_createdAt_idx"
      ON "receipts"("workspaceId", "createdAt" DESC);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "receipts_subscriptionId_idx"
      ON "receipts"("subscriptionId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "receipts_status_idx"
      ON "receipts"("status");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "invoices" (
    "id"             TEXT           NOT NULL,
    "number"         TEXT           NOT NULL,
    "workspaceId"    TEXT           NOT NULL,
    "organizationId" TEXT           NOT NULL,
    "planId"         TEXT           NOT NULL,
    "billingPeriod"  "BillingPeriod" NOT NULL,
    "periodStart"    TIMESTAMP(3)   NOT NULL,
    "periodEnd"      TIMESTAMP(3)   NOT NULL,
    "seatsCount"     INTEGER        NOT NULL DEFAULT 1,
    "subtotalRub"    INTEGER        NOT NULL,
    "vatRub"         INTEGER        NOT NULL DEFAULT 0,
    "totalRub"       INTEGER        NOT NULL,
    "currency"       TEXT           NOT NULL DEFAULT 'RUB',
    "pdfUrl"         TEXT,
    "contractPdfUrl" TEXT,
    "actPdfUrl"      TEXT,
    "status"         "InvoiceStatus" NOT NULL,
    "statusChangedAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt"          TIMESTAMP(3)   NOT NULL,
    "paidAt"         TIMESTAMP(3),
    "cancelledAt"    TIMESTAMP(3),
    "subscriptionId" TEXT,
    "createdAt"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)   NOT NULL,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "invoices_number_key" ON "invoices"("number");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "invoices_workspaceId_issuedAt_idx"
      ON "invoices"("workspaceId", "issuedAt" DESC);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "invoices_status_dueAt_idx"
      ON "invoices"("status", "dueAt");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "promo_codes" (
    "id"                     TEXT           NOT NULL,
    "code"                   TEXT           NOT NULL,
    "discountType"           "DiscountType" NOT NULL,
    "discountValue"          INTEGER        NOT NULL,
    "maxDiscountRub"         INTEGER,
    "applicableToCategories" "PlanCategory"[] DEFAULT ARRAY[]::"PlanCategory"[],
    "isFirstPaymentOnly"     BOOLEAN        NOT NULL DEFAULT true,
    "validFrom"              TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil"             TIMESTAMP(3),
    "maxTotalRedemptions"    INTEGER,
    "maxPerUser"             INTEGER        NOT NULL DEFAULT 1,
    "redemptionsCount"       INTEGER        NOT NULL DEFAULT 0,
    "source"                 TEXT,
    "createdByUserId"        TEXT,
    "createdAt"              TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3)   NOT NULL,
    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_key" ON "promo_codes"("code");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "promo_code_rules" (
    "promoCodeId" TEXT NOT NULL,
    "planId"      TEXT NOT NULL,
    CONSTRAINT "promo_code_rules_pkey" PRIMARY KEY ("promoCodeId", "planId")
);

CREATE TABLE IF NOT EXISTS "promo_code_redemptions" (
    "id"                 TEXT         NOT NULL,
    "promoCodeId"        TEXT         NOT NULL,
    "workspaceId"        TEXT         NOT NULL,
    "userId"             TEXT         NOT NULL,
    "paymentId"          TEXT,
    "discountAppliedRub" INTEGER      NOT NULL,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promo_code_redemptions_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "promo_code_redemptions_promoCodeId_workspaceId_key"
      ON "promo_code_redemptions"("promoCodeId", "workspaceId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "promo_code_redemptions_workspaceId_idx"
      ON "promo_code_redemptions"("workspaceId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "dunning_attempts" (
    "id"                 TEXT             NOT NULL,
    "subscriptionId"     TEXT             NOT NULL,
    "attemptNumber"      INTEGER          NOT NULL,
    "scheduledAt"        TIMESTAMP(3)     NOT NULL,
    "executedAt"         TIMESTAMP(3),
    "paymentId"          TEXT,
    "result"             "DunningResult",
    "failureReason"      TEXT,
    "emailSentAt"        TIMESTAMP(3),
    "userResponseAction" "UserDunningAction",
    "createdAt"          TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dunning_attempts_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "dunning_attempts_paymentId_key"
      ON "dunning_attempts"("paymentId") WHERE "paymentId" IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "dunning_attempts_subscriptionId_attemptNumber_idx"
      ON "dunning_attempts"("subscriptionId", "attemptNumber");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "dunning_attempts_scheduledAt_result_idx"
      ON "dunning_attempts"("scheduledAt", "result");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. ТАБЛИЦЫ РЕФЕРАЛЬНОЙ ПРОГРАММЫ (из 030000)
--    ProfessionalRole создан выше, поэтому referrals теперь создаётся.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "referral_codes" (
    "id"          TEXT         NOT NULL,
    "code"        TEXT         NOT NULL,
    "userId"      TEXT         NOT NULL,
    "clickCount"  INTEGER      NOT NULL DEFAULT 0,
    "signupCount" INTEGER      NOT NULL DEFAULT 0,
    "paidCount"   INTEGER      NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_code_key"
      ON "referral_codes"("code");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_userId_key"
      ON "referral_codes"("userId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "referrals" (
    "id"                    TEXT               NOT NULL,
    "codeId"                TEXT               NOT NULL,
    "referrerId"            TEXT               NOT NULL,
    "referredUserId"        TEXT,
    "referrerRole"          "ProfessionalRole",
    "referredRole"          "ProfessionalRole",
    "isCrossRole"           BOOLEAN            NOT NULL DEFAULT false,
    "signupAt"              TIMESTAMP(3),
    "firstPaidAt"           TIMESTAMP(3),
    "firstPaymentAmountRub" INTEGER,
    "firstPaymentId"        TEXT,
    "rewardType"            "RewardType",
    "rewardAmountRub"       INTEGER            NOT NULL DEFAULT 0,
    "rewardStatus"          "RewardStatus"     NOT NULL DEFAULT 'PENDING',
    "rewardGrantedAt"       TIMESTAMP(3),
    "discountAmountRub"     INTEGER            NOT NULL DEFAULT 0,
    "discountApplied"       BOOLEAN            NOT NULL DEFAULT false,
    "clickIp"               TEXT,
    "clickUserAgent"        TEXT,
    "signupIp"              TEXT,
    "suspicious"            BOOLEAN            NOT NULL DEFAULT false,
    "fraudReasons"          TEXT[]             DEFAULT ARRAY[]::TEXT[],
    "createdAt"             TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "referrals_referrerId_idx"     ON "referrals"("referrerId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "referrals_referredUserId_idx" ON "referrals"("referredUserId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "referrals_rewardStatus_idx"   ON "referrals"("rewardStatus");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "workspace_credits" (
    "id"          TEXT         NOT NULL,
    "workspaceId" TEXT         NOT NULL,
    "balanceRub"  INTEGER      NOT NULL DEFAULT 0,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_credits_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "workspace_credits_workspaceId_key"
      ON "workspace_credits"("workspaceId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "credit_ledger_entries" (
    "id"          TEXT             NOT NULL,
    "creditId"    TEXT             NOT NULL,
    "amountRub"   INTEGER          NOT NULL,
    "type"        "LedgerEntryType" NOT NULL,
    "description" TEXT             NOT NULL,
    "referralId"  TEXT,
    "paymentId"   TEXT,
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "credit_ledger_entries_creditId_idx"
      ON "credit_ledger_entries"("creditId");
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. FOREIGN KEY CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════

-- subscriptions → workspaces
DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- subscriptions → subscription_plans
DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- workspaces → subscriptions (activeSubscription)
DO $$ BEGIN
  ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_activeSubscriptionId_fkey"
    FOREIGN KEY ("activeSubscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payments → workspaces
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payments → users
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payments → subscriptions
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payment_methods → workspaces
DO $$ BEGIN
  ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- subscriptions → payment_methods (defaultPaymentMethodId)
DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_defaultPaymentMethodId_fkey"
    FOREIGN KEY ("defaultPaymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payments → payment_methods
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentMethodId_fkey"
    FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payments → promo_codes
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payments → invoices
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payments → receipts
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_receiptId_fkey"
    FOREIGN KEY ("receiptId") REFERENCES "receipts"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- subscription_events → subscriptions
DO $$ BEGIN
  ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- subscription_events → users
DO $$ BEGIN
  ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- receipts → workspaces
DO $$ BEGIN
  ALTER TABLE "receipts" ADD CONSTRAINT "receipts_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- receipts → subscriptions
DO $$ BEGIN
  ALTER TABLE "receipts" ADD CONSTRAINT "receipts_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- subscriptions → subscription_plans (pendingPlanId)
DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pendingPlanId_fkey"
    FOREIGN KEY ("pendingPlanId") REFERENCES "subscription_plans"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- invoices → workspaces
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- invoices → organizations
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- invoices → subscription_plans
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- invoices → subscriptions
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- promo_codes → users
DO $$ BEGIN
  ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- promo_code_rules → promo_codes
DO $$ BEGIN
  ALTER TABLE "promo_code_rules" ADD CONSTRAINT "promo_code_rules_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- promo_code_rules → subscription_plans
DO $$ BEGIN
  ALTER TABLE "promo_code_rules" ADD CONSTRAINT "promo_code_rules_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- promo_code_redemptions → promo_codes
DO $$ BEGIN
  ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- promo_code_redemptions → workspaces
DO $$ BEGIN
  ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- promo_code_redemptions → users
DO $$ BEGIN
  ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- promo_code_redemptions → payments
DO $$ BEGIN
  ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- dunning_attempts → subscriptions
DO $$ BEGIN
  ALTER TABLE "dunning_attempts" ADD CONSTRAINT "dunning_attempts_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- dunning_attempts → payments
DO $$ BEGIN
  ALTER TABLE "dunning_attempts" ADD CONSTRAINT "dunning_attempts_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- referral_codes → users
DO $$ BEGIN
  ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- referrals → referral_codes
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_codeId_fkey"
    FOREIGN KEY ("codeId") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- referrals → users (referrer)
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey"
    FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- referrals → users (referred)
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey"
    FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- workspace_credits → workspaces
DO $$ BEGIN
  ALTER TABLE "workspace_credits" ADD CONSTRAINT "workspace_credits_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- credit_ledger_entries → workspace_credits
DO $$ BEGIN
  ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_creditId_fkey"
    FOREIGN KEY ("creditId") REFERENCES "workspace_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payments → referrals
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_referralId_fkey"
    FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
