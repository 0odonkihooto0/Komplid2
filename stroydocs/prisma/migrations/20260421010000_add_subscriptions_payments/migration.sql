-- Модуль 15 Фаза 2: Подписки и Feature-gate

-- CreateEnum: типы тарифных планов
CREATE TYPE "PlanType" AS ENUM ('FREE', 'SOLO_BASIC', 'SOLO_PRO', 'TEAM', 'CORPORATE');

-- CreateEnum: профессиональные роли (B2C)
CREATE TYPE "ProfessionalRole" AS ENUM ('SMETCHIK', 'PTO', 'FOREMAN', 'SK_INSPECTOR', 'SUPPLIER', 'PROJECT_MANAGER', 'ACCOUNTANT');

-- CreateEnum: статусы подписки
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'INCOMPLETE');

-- CreateEnum: период биллинга
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum: источник платежа
CREATE TYPE "PaymentSource" AS ENUM ('APP', 'TILDA');

-- CreateEnum: статус платежа
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateTable: каталог тарифных планов
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "planType" "PlanType" NOT NULL,
    "targetRole" "ProfessionalRole",
    "requiresPersonalWorkspace" BOOLEAN NOT NULL DEFAULT false,
    "priceMonthlyRub" INTEGER NOT NULL,
    "priceYearlyRub" INTEGER NOT NULL,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "limits" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateTable: подписки (экземпляры плана на workspace)
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "yookassaSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_yookassaSubscriptionId_key" ON "subscriptions"("yookassaSubscriptionId");
CREATE INDEX "subscriptions_workspaceId_idx" ON "subscriptions"("workspaceId");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX "subscriptions_currentPeriodEnd_idx" ON "subscriptions"("currentPeriodEnd");

-- CreateTable: платежи
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "PaymentSource" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amountRub" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "yookassaPaymentId" TEXT,
    "yookassaIdempotencyKey" TEXT,
    "referralCreditApplied" INTEGER NOT NULL DEFAULT 0,
    "referralDiscountApplied" INTEGER NOT NULL DEFAULT 0,
    "referralId" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_yookassaPaymentId_key" ON "payments"("yookassaPaymentId");
CREATE INDEX "payments_workspaceId_idx" ON "payments"("workspaceId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_yookassaPaymentId_idx" ON "payments"("yookassaPaymentId");

-- AlterTable: расширить workspaces
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "activeSubscriptionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_activeSubscriptionId_key" ON "workspaces"("activeSubscriptionId");

-- AlterTable: расширить users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "professionalRole" "ProfessionalRole";

-- AddForeignKey: subscriptions -> workspaces
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: subscriptions -> subscription_plans
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: workspaces -> subscriptions (activeSubscription)
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_activeSubscriptionId_fkey"
    FOREIGN KEY ("activeSubscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: payments -> workspaces
ALTER TABLE "payments" ADD CONSTRAINT "payments_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: payments -> users
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: payments -> subscriptions
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
