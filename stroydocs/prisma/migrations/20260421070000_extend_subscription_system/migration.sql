-- Модуль 15 Фаза 8: Расширенная система подписок и биллинга
-- Идемпотентная миграция: все операции используют IF NOT EXISTS / IF EXISTS

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Расширить существующие enum-типы
-- ─────────────────────────────────────────────────────────────────────────

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIALING';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'GRACE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'MARKETING';
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'API';
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'WEBHOOK';

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_CAPTURE';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'AUTHORIZED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Создать новые enum-типы (идемпотентно)
-- ─────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "PlanCategory" AS ENUM ('FREEMIUM', 'B2C', 'B2B', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ProfiRole" AS ENUM ('SMETCHIK', 'PTO', 'PRORAB');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CancellationReasonCode" AS ENUM (
    'TOO_EXPENSIVE', 'MISSING_FEATURES', 'COMPETITOR', 'NOT_USING',
    'TECHNICAL_ISSUES', 'TEMPORARY', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentType" AS ENUM (
    'PLAN_PAYMENT', 'PLAN_RENEWAL', 'PLAN_UPGRADE', 'PLAN_PRORATION',
    'CREDIT_TOPUP', 'REFUND', 'MANUAL'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('YOOKASSA', 'TINKOFF', 'SBERBANK', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethodType" AS ENUM (
    'BANK_CARD', 'SBP', 'YOOMONEY', 'SBERPAY', 'TPAY', 'YANDEX_PAY', 'INVOICE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionEventType" AS ENUM (
    'CREATED', 'TRIAL_STARTED', 'TRIAL_ENDED', 'TRIAL_CONVERTED',
    'RENEWED', 'RENEWAL_FAILED', 'UPGRADED', 'DOWNGRADED',
    'PLAN_CHANGE_SCHEDULED', 'CANCELLED', 'REACTIVATED', 'EXPIRED',
    'GRACE_STARTED', 'GRACE_EXPIRED', 'PAUSED', 'RESUMED',
    'PAYMENT_METHOD_CHANGED', 'DUNNING_START', 'DUNNING_RESOLVED',
    'DUNNING_FAILED', 'PROMO_APPLIED', 'MANUAL_EXTENSION'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'ADMIN', 'WEBHOOK', 'API');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReceiptType" AS ENUM (
    'PAYMENT', 'PREPAYMENT', 'FULL_PAYMENT', 'REFUND', 'CREDIT'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReceiptProvider" AS ENUM (
    'YOOKASSA', 'EVOTOR_CLOUD', 'ATOL_ONLINE', 'NONE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReceiptStatus" AS ENUM (
    'PENDING', 'SUBMITTED', 'REGISTERED', 'FAILED', 'RETRY'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM (
    'DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM (
    'PERCENT', 'FIXED_AMOUNT', 'TRIAL_DAYS', 'FREE_MONTHS'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DunningResult" AS ENUM (
    'SUCCESS', 'FAILED', 'CARD_EXPIRED', 'USER_CANCELLED', 'USER_UPDATED_CARD'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "UserDunningAction" AS ENUM (
    'UPDATED_PAYMENT_METHOD', 'CANCELLED_SUBSCRIPTION', 'IGNORED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Расширить таблицу subscription_plans
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "category"    "PlanCategory",
  ADD COLUMN IF NOT EXISTS "profiRole"   "ProfiRole",
  ADD COLUMN IF NOT EXISTS "billingPeriod" "BillingPeriod",
  ADD COLUMN IF NOT EXISTS "priceRub"    INTEGER,
  ADD COLUMN IF NOT EXISTS "oldPriceRub" INTEGER,
  ADD COLUMN IF NOT EXISTS "currency"    TEXT NOT NULL DEFAULT 'RUB',
  ADD COLUMN IF NOT EXISTS "maxObjects"            INTEGER,
  ADD COLUMN IF NOT EXISTS "maxUsers"              INTEGER,
  ADD COLUMN IF NOT EXISTS "maxGuests"             INTEGER,
  ADD COLUMN IF NOT EXISTS "maxStorageGb"          INTEGER,
  ADD COLUMN IF NOT EXISTS "maxEstimatesPerMonth"  INTEGER,
  ADD COLUMN IF NOT EXISTS "maxAosrPerMonth"       INTEGER,
  ADD COLUMN IF NOT EXISTS "maxActiveObjects"      INTEGER,
  ADD COLUMN IF NOT EXISTS "maxJournalEntriesPerMonth" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxPublicLinksActive"  INTEGER,
  ADD COLUMN IF NOT EXISTS "trialDays"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "trialFeatures" JSONB,
  ADD COLUMN IF NOT EXISTS "isPopular"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isVisible"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isLegacy"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "metadata"      JSONB;

-- Изменить тип поля features с TEXT[] на JSONB (с потерей данных, допустимо в dev)
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
  ELSE
    ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "features" JSONB NOT NULL DEFAULT '[]';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "subscription_plans_category_profiRole_idx"
  ON "subscription_plans"("category", "profiRole");

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Расширить таблицу subscriptions
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "startedAt"            TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trialStart"           TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelReason"         "CancellationReasonCode",
  ADD COLUMN IF NOT EXISTS "cancelFeedback"       TEXT,
  ADD COLUMN IF NOT EXISTS "effectiveEndDate"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pendingPlanId"        TEXT,
  ADD COLUMN IF NOT EXISTS "pendingPlanChangeAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "autoRenew"            BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "defaultPaymentMethodId" TEXT,
  ADD COLUMN IF NOT EXISTS "graceUntil"           TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dunningAttempts"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextDunningAt"        TIMESTAMP(3);

-- Обновить индексы subscriptions
DROP INDEX IF EXISTS "subscriptions_workspaceId_idx";
DROP INDEX IF EXISTS "subscriptions_status_idx";
DROP INDEX IF EXISTS "subscriptions_currentPeriodEnd_idx";

CREATE INDEX IF NOT EXISTS "subscriptions_workspaceId_status_idx"
  ON "subscriptions"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "subscriptions_status_currentPeriodEnd_idx"
  ON "subscriptions"("status", "currentPeriodEnd");
CREATE INDEX IF NOT EXISTS "subscriptions_status_graceUntil_idx"
  ON "subscriptions"("status", "graceUntil");
CREATE INDEX IF NOT EXISTS "subscriptions_status_nextDunningAt_idx"
  ON "subscriptions"("status", "nextDunningAt");

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Расширить таблицу payments
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "type"                   "PaymentType",
  ADD COLUMN IF NOT EXISTS "billingPeriod"          "BillingPeriod",
  ADD COLUMN IF NOT EXISTS "description"            TEXT,
  ADD COLUMN IF NOT EXISTS "metadata"               JSONB,
  ADD COLUMN IF NOT EXISTS "provider"               "PaymentProvider" NOT NULL DEFAULT 'YOOKASSA',
  ADD COLUMN IF NOT EXISTS "providerPaymentId"      TEXT,
  ADD COLUMN IF NOT EXISTS "providerIdempotenceKey" TEXT,
  ADD COLUMN IF NOT EXISTS "providerMetadata"       JSONB,
  ADD COLUMN IF NOT EXISTS "requiresCapture"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "capturedAt"             TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmationUrl"        TEXT,
  ADD COLUMN IF NOT EXISTS "paymentMethodId"        TEXT,
  ADD COLUMN IF NOT EXISTS "savePaymentMethod"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "paymentMethodSnapshot"  JSONB,
  ADD COLUMN IF NOT EXISTS "promoCodeId"            TEXT,
  ADD COLUMN IF NOT EXISTS "discountRub"            INTEGER,
  ADD COLUMN IF NOT EXISTS "originalAmountRub"      INTEGER,
  ADD COLUMN IF NOT EXISTS "refundedAmountRub"      INTEGER,
  ADD COLUMN IF NOT EXISTS "refundReason"           TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceId"              TEXT,
  ADD COLUMN IF NOT EXISTS "receiptId"              TEXT,
  ADD COLUMN IF NOT EXISTS "ipAddress"              TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent"              TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt"              TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_providerPaymentId_key"
  ON "payments"("providerPaymentId") WHERE "providerPaymentId" IS NOT NULL;

DROP INDEX IF EXISTS "payments_workspaceId_idx";
CREATE INDEX IF NOT EXISTS "payments_workspaceId_createdAt_idx"
  ON "payments"("workspaceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "payments_subscriptionId_idx"
  ON "payments"("subscriptionId");
CREATE INDEX IF NOT EXISTS "payments_status_createdAt_idx"
  ON "payments"("status", "createdAt");

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Создать новые таблицы
-- ─────────────────────────────────────────────────────────────────────────

-- PaymentMethod: сохранённые токены ЮKassa
CREATE TABLE IF NOT EXISTS "payment_methods" (
    "id"                     TEXT NOT NULL,
    "workspaceId"            TEXT NOT NULL,
    "provider"               "PaymentProvider" NOT NULL DEFAULT 'YOOKASSA',
    "providerMethodId"       TEXT NOT NULL,
    "type"                   "PaymentMethodType" NOT NULL,
    "cardBrand"              TEXT,
    "cardLast4"              TEXT,
    "cardExpiryMonth"        INTEGER,
    "cardExpiryYear"         INTEGER,
    "accountTitle"           TEXT,
    "isActive"               BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt"          TIMESTAMP(3),
    "deactivationReason"     TEXT,
    "isDefault"              BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt"             TIMESTAMP(3),
    "successfulChargesCount" INTEGER NOT NULL DEFAULT 0,
    "failedChargesCount"     INTEGER NOT NULL DEFAULT 0,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_workspaceId_providerMethodId_key"
  ON "payment_methods"("workspaceId", "providerMethodId");
CREATE INDEX IF NOT EXISTS "payment_methods_workspaceId_isActive_idx"
  ON "payment_methods"("workspaceId", "isActive");

-- SubscriptionEvent: audit log изменений подписки
CREATE TABLE IF NOT EXISTS "subscription_events" (
    "id"             TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "type"           "SubscriptionEventType" NOT NULL,
    "payload"        JSONB NOT NULL,
    "actorType"      "ActorType" NOT NULL,
    "actorUserId"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscription_events_subscriptionId_createdAt_idx"
  ON "subscription_events"("subscriptionId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "subscription_events_type_createdAt_idx"
  ON "subscription_events"("type", "createdAt");

-- Receipt: чеки ФЗ-54
CREATE TABLE IF NOT EXISTS "receipts" (
    "id"                         TEXT NOT NULL,
    "workspaceId"                TEXT NOT NULL,
    "subscriptionId"             TEXT,
    "type"                       "ReceiptType" NOT NULL,
    "customerEmail"              TEXT NOT NULL,
    "customerPhone"              TEXT,
    "customerInn"                TEXT,
    "items"                      JSONB NOT NULL,
    "totalRub"                   INTEGER NOT NULL,
    "vatRub"                     INTEGER NOT NULL DEFAULT 0,
    "provider"                   "ReceiptProvider" NOT NULL DEFAULT 'YOOKASSA',
    "providerReceiptId"          TEXT,
    "ofdUrl"                     TEXT,
    "ofdPdfUrl"                  TEXT,
    "status"                     "ReceiptStatus" NOT NULL,
    "statusChangedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage"               TEXT,
    "fiscalDocumentNumber"       TEXT,
    "fiscalDocumentAttribute"    TEXT,
    "fiscalDriveNumber"          TEXT,
    "registeredAt"               TIMESTAMP(3),
    "createdAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "receipts_providerReceiptId_key"
  ON "receipts"("providerReceiptId") WHERE "providerReceiptId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "receipts_workspaceId_createdAt_idx"
  ON "receipts"("workspaceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "receipts_subscriptionId_idx"
  ON "receipts"("subscriptionId");
CREATE INDEX IF NOT EXISTS "receipts_status_idx"
  ON "receipts"("status");

-- Invoice: счета для юрлиц
CREATE TABLE IF NOT EXISTS "invoices" (
    "id"              TEXT NOT NULL,
    "number"          TEXT NOT NULL,
    "workspaceId"     TEXT NOT NULL,
    "organizationId"  TEXT NOT NULL,
    "planId"          TEXT NOT NULL,
    "billingPeriod"   "BillingPeriod" NOT NULL,
    "periodStart"     TIMESTAMP(3) NOT NULL,
    "periodEnd"       TIMESTAMP(3) NOT NULL,
    "seatsCount"      INTEGER NOT NULL DEFAULT 1,
    "subtotalRub"     INTEGER NOT NULL,
    "vatRub"          INTEGER NOT NULL DEFAULT 0,
    "totalRub"        INTEGER NOT NULL,
    "currency"        TEXT NOT NULL DEFAULT 'RUB',
    "pdfUrl"          TEXT,
    "contractPdfUrl"  TEXT,
    "actPdfUrl"       TEXT,
    "status"          "InvoiceStatus" NOT NULL,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt"           TIMESTAMP(3) NOT NULL,
    "paidAt"          TIMESTAMP(3),
    "cancelledAt"     TIMESTAMP(3),
    "subscriptionId"  TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_number_key"
  ON "invoices"("number");
CREATE INDEX IF NOT EXISTS "invoices_workspaceId_issuedAt_idx"
  ON "invoices"("workspaceId", "issuedAt" DESC);
CREATE INDEX IF NOT EXISTS "invoices_status_dueAt_idx"
  ON "invoices"("status", "dueAt");

-- PromoCode: скидочные коды
CREATE TABLE IF NOT EXISTS "promo_codes" (
    "id"                    TEXT NOT NULL,
    "code"                  TEXT NOT NULL,
    "discountType"          "DiscountType" NOT NULL,
    "discountValue"         INTEGER NOT NULL,
    "maxDiscountRub"        INTEGER,
    "applicableToCategories" "PlanCategory"[] DEFAULT ARRAY[]::"PlanCategory"[],
    "isFirstPaymentOnly"    BOOLEAN NOT NULL DEFAULT true,
    "validFrom"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil"            TIMESTAMP(3),
    "maxTotalRedemptions"   INTEGER,
    "maxPerUser"            INTEGER NOT NULL DEFAULT 1,
    "redemptionsCount"      INTEGER NOT NULL DEFAULT 0,
    "source"                TEXT,
    "createdByUserId"       TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_key"
  ON "promo_codes"("code");

-- PromoCodeRule: M:N промокод↔план
CREATE TABLE IF NOT EXISTS "promo_code_rules" (
    "promoCodeId" TEXT NOT NULL,
    "planId"      TEXT NOT NULL,

    CONSTRAINT "promo_code_rules_pkey" PRIMARY KEY ("promoCodeId", "planId")
);

-- PromoCodeRedemption: применение промокода
CREATE TABLE IF NOT EXISTS "promo_code_redemptions" (
    "id"                 TEXT NOT NULL,
    "promoCodeId"        TEXT NOT NULL,
    "workspaceId"        TEXT NOT NULL,
    "userId"             TEXT NOT NULL,
    "paymentId"          TEXT,
    "discountAppliedRub" INTEGER NOT NULL,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_code_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "promo_code_redemptions_promoCodeId_workspaceId_key"
  ON "promo_code_redemptions"("promoCodeId", "workspaceId");
CREATE INDEX IF NOT EXISTS "promo_code_redemptions_workspaceId_idx"
  ON "promo_code_redemptions"("workspaceId");

-- DunningAttempt: retry-попытки списания
CREATE TABLE IF NOT EXISTS "dunning_attempts" (
    "id"                 TEXT NOT NULL,
    "subscriptionId"     TEXT NOT NULL,
    "attemptNumber"      INTEGER NOT NULL,
    "scheduledAt"        TIMESTAMP(3) NOT NULL,
    "executedAt"         TIMESTAMP(3),
    "paymentId"          TEXT,
    "result"             "DunningResult",
    "failureReason"      TEXT,
    "emailSentAt"        TIMESTAMP(3),
    "userResponseAction" "UserDunningAction",
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dunning_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dunning_attempts_paymentId_key"
  ON "dunning_attempts"("paymentId") WHERE "paymentId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "dunning_attempts_subscriptionId_attemptNumber_idx"
  ON "dunning_attempts"("subscriptionId", "attemptNumber");
CREATE INDEX IF NOT EXISTS "dunning_attempts_scheduledAt_result_idx"
  ON "dunning_attempts"("scheduledAt", "result");

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Foreign Key constraints (добавляем в конце, после создания таблиц)
-- ─────────────────────────────────────────────────────────────────────────

-- payment_methods → workspaces
DO $$ BEGIN
  ALTER TABLE "payment_methods"
    ADD CONSTRAINT "payment_methods_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- subscriptions → payment_methods (defaultPaymentMethodId)
DO $$ BEGIN
  ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_defaultPaymentMethodId_fkey"
    FOREIGN KEY ("defaultPaymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- payments → payment_methods
DO $$ BEGIN
  ALTER TABLE "payments"
    ADD CONSTRAINT "payments_paymentMethodId_fkey"
    FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- payments → promo_codes
DO $$ BEGIN
  ALTER TABLE "payments"
    ADD CONSTRAINT "payments_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- payments → invoices
DO $$ BEGIN
  ALTER TABLE "payments"
    ADD CONSTRAINT "payments_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- payments → receipts
DO $$ BEGIN
  ALTER TABLE "payments"
    ADD CONSTRAINT "payments_receiptId_fkey"
    FOREIGN KEY ("receiptId") REFERENCES "receipts"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- subscription_events → subscriptions
DO $$ BEGIN
  ALTER TABLE "subscription_events"
    ADD CONSTRAINT "subscription_events_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- subscription_events → users (actorUserId)
DO $$ BEGIN
  ALTER TABLE "subscription_events"
    ADD CONSTRAINT "subscription_events_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- receipts → workspaces
DO $$ BEGIN
  ALTER TABLE "receipts"
    ADD CONSTRAINT "receipts_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- receipts → subscriptions
DO $$ BEGIN
  ALTER TABLE "receipts"
    ADD CONSTRAINT "receipts_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- subscription_events → subscriptions
DO $$ BEGIN
  ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_pendingPlanId_fkey"
    FOREIGN KEY ("pendingPlanId") REFERENCES "subscription_plans"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- invoices → workspaces
DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- invoices → organizations
DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- invoices → subscription_plans
DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- invoices → subscriptions
DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- promo_codes → users (createdByUserId)
DO $$ BEGIN
  ALTER TABLE "promo_codes"
    ADD CONSTRAINT "promo_codes_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- promo_code_rules → promo_codes
DO $$ BEGIN
  ALTER TABLE "promo_code_rules"
    ADD CONSTRAINT "promo_code_rules_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- promo_code_rules → subscription_plans
DO $$ BEGIN
  ALTER TABLE "promo_code_rules"
    ADD CONSTRAINT "promo_code_rules_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- promo_code_redemptions → promo_codes
DO $$ BEGIN
  ALTER TABLE "promo_code_redemptions"
    ADD CONSTRAINT "promo_code_redemptions_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- promo_code_redemptions → workspaces
DO $$ BEGIN
  ALTER TABLE "promo_code_redemptions"
    ADD CONSTRAINT "promo_code_redemptions_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- promo_code_redemptions → users
DO $$ BEGIN
  ALTER TABLE "promo_code_redemptions"
    ADD CONSTRAINT "promo_code_redemptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- promo_code_redemptions → payments
DO $$ BEGIN
  ALTER TABLE "promo_code_redemptions"
    ADD CONSTRAINT "promo_code_redemptions_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- dunning_attempts → subscriptions
DO $$ BEGIN
  ALTER TABLE "dunning_attempts"
    ADD CONSTRAINT "dunning_attempts_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- dunning_attempts → payments
DO $$ BEGIN
  ALTER TABLE "dunning_attempts"
    ADD CONSTRAINT "dunning_attempts_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;
