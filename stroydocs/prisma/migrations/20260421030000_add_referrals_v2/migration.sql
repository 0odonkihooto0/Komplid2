-- Модуль 15 Фаза 5: Реферальная программа 2.0

-- CreateEnum: RewardType
DO $$ BEGIN
  CREATE TYPE "RewardType" AS ENUM ('CREDIT', 'CASHBACK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum: RewardStatus
DO $$ BEGIN
  CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'GRANTED', 'PAID', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum: LedgerEntryType
DO $$ BEGIN
  CREATE TYPE "LedgerEntryType" AS ENUM ('REFERRAL_BONUS', 'PAYMENT_DEDUCTION', 'MANUAL_ADJUSTMENT', 'REFUND');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable: referral_codes
CREATE TABLE IF NOT EXISTS "referral_codes" (
  "id"          TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "clickCount"  INTEGER NOT NULL DEFAULT 0,
  "signupCount" INTEGER NOT NULL DEFAULT 0,
  "paidCount"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: referrals
CREATE TABLE IF NOT EXISTS "referrals" (
  "id"                    TEXT NOT NULL,
  "codeId"                TEXT NOT NULL,
  "referrerId"            TEXT NOT NULL,
  "referredUserId"        TEXT,
  "referrerRole"          "ProfessionalRole",
  "referredRole"          "ProfessionalRole",
  "isCrossRole"           BOOLEAN NOT NULL DEFAULT false,
  "signupAt"              TIMESTAMP(3),
  "firstPaidAt"           TIMESTAMP(3),
  "firstPaymentAmountRub" INTEGER,
  "firstPaymentId"        TEXT,
  "rewardType"            "RewardType",
  "rewardAmountRub"       INTEGER NOT NULL DEFAULT 0,
  "rewardStatus"          "RewardStatus" NOT NULL DEFAULT 'PENDING',
  "rewardGrantedAt"       TIMESTAMP(3),
  "discountAmountRub"     INTEGER NOT NULL DEFAULT 0,
  "discountApplied"       BOOLEAN NOT NULL DEFAULT false,
  "clickIp"               TEXT,
  "clickUserAgent"        TEXT,
  "signupIp"              TEXT,
  "suspicious"            BOOLEAN NOT NULL DEFAULT false,
  "fraudReasons"          TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: workspace_credits
CREATE TABLE IF NOT EXISTS "workspace_credits" (
  "id"          TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "balanceRub"  INTEGER NOT NULL DEFAULT 0,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable: credit_ledger_entries
CREATE TABLE IF NOT EXISTS "credit_ledger_entries" (
  "id"          TEXT NOT NULL,
  "creditId"    TEXT NOT NULL,
  "amountRub"   INTEGER NOT NULL,
  "type"        "LedgerEntryType" NOT NULL,
  "description" TEXT NOT NULL,
  "referralId"  TEXT,
  "paymentId"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_code_key"       ON "referral_codes"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_userId_key"     ON "referral_codes"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_credits_workspaceId_key" ON "workspace_credits"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referrals_referrerId_idx"      ON "referrals"("referrerId");
CREATE INDEX IF NOT EXISTS "referrals_referredUserId_idx"  ON "referrals"("referredUserId");
CREATE INDEX IF NOT EXISTS "referrals_rewardStatus_idx"    ON "referrals"("rewardStatus");
CREATE INDEX IF NOT EXISTS "credit_ledger_entries_creditId_idx" ON "credit_ledger_entries"("creditId");

-- AddForeignKey: referral_codes -> users
DO $$ BEGIN
  ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey: referrals -> referral_codes
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_codeId_fkey"
    FOREIGN KEY ("codeId") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey: referrals -> users (referrer)
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey"
    FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey: referrals -> users (referred)
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey"
    FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey: workspace_credits -> workspaces
DO $$ BEGIN
  ALTER TABLE "workspace_credits" ADD CONSTRAINT "workspace_credits_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey: credit_ledger_entries -> workspace_credits
DO $$ BEGIN
  ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_creditId_fkey"
    FOREIGN KEY ("creditId") REFERENCES "workspace_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey: payments -> referrals
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_referralId_fkey"
    FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
