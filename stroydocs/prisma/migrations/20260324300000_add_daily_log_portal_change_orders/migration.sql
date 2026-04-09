-- CreateEnum
CREATE TYPE "ChangeOrderStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "PhotoEntityType" ADD VALUE 'DAILY_LOG';

-- AlterTable: Contract — add relations (handled by FK columns below)

-- AlterTable: User — no column changes needed (relations only)

-- AlterTable: Project — no column changes needed (relations only)

-- CreateTable: DailyLog
CREATE TABLE "daily_logs" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weather" TEXT,
    "temperature" INTEGER,
    "workersCount" INTEGER,
    "notes" TEXT,
    "contractId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ProjectPortalToken
CREATE TABLE "project_portal_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_portal_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ChangeOrder
CREATE TABLE "change_orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "ChangeOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_orders_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "daily_logs_contractId_date_key" ON "daily_logs"("contractId", "date");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "project_portal_tokens_token_key" ON "project_portal_tokens"("token");

-- CreateIndex
CREATE INDEX "daily_logs_contractId_idx" ON "daily_logs"("contractId");

-- CreateIndex
CREATE INDEX "daily_logs_date_idx" ON "daily_logs"("date");

-- CreateIndex
CREATE INDEX "project_portal_tokens_projectId_idx" ON "project_portal_tokens"("projectId");

-- CreateIndex
CREATE INDEX "change_orders_contractId_idx" ON "change_orders"("contractId");

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_portal_tokens" ADD CONSTRAINT "project_portal_tokens_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_portal_tokens" ADD CONSTRAINT "project_portal_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
