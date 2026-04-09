-- Модуль 4: Управление проектом
-- Новые таблицы: contract_categories, contract_payments,
-- project_folders, project_documents, project_document_versions, project_events

-- CreateEnum
CREATE TYPE "ContractPaymentType" AS ENUM ('PLAN', 'FACT');

-- CreateEnum
CREATE TYPE "ProjectEventType" AS ENUM ('MEETING', 'GSN_INSPECTION', 'ACCEPTANCE', 'AUDIT', 'COMMISSIONING', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectEventStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- AlterTable: добавить categoryId в contracts
ALTER TABLE "contracts" ADD COLUMN "categoryId" TEXT;

-- CreateTable: contract_categories
CREATE TABLE "contract_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trackPayments" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: contract_payments
CREATE TABLE "contract_payments" (
    "id" TEXT NOT NULL,
    "paymentType" "ContractPaymentType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "budgetType" TEXT,
    "description" TEXT,
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: project_folders
CREATE TABLE "project_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "pinTop" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: project_documents
CREATE TABLE "project_documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActual" BOOLEAN NOT NULL DEFAULT true,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "qrCodeS3Key" TEXT,
    "qrToken" TEXT,
    "folderId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: project_document_versions
CREATE TABLE "project_document_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "comment" TEXT,
    "uploadedById" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: project_events
CREATE TABLE "project_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "ProjectEventType" NOT NULL,
    "status" "ProjectEventStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notifyDays" INTEGER NOT NULL DEFAULT 3,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "organizerId" TEXT NOT NULL,
    "participantIds" TEXT[],
    "protocolS3Key" TEXT,
    "protocolFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_categories_organizationId_idx" ON "contract_categories"("organizationId");

-- CreateIndex
CREATE INDEX "contract_payments_contractId_idx" ON "contract_payments"("contractId");

-- CreateIndex
CREATE INDEX "contract_payments_paymentDate_idx" ON "contract_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "project_folders_projectId_idx" ON "project_folders"("projectId");

-- CreateIndex
CREATE INDEX "project_folders_parentId_idx" ON "project_folders"("parentId");

-- CreateIndex
CREATE INDEX "project_documents_folderId_idx" ON "project_documents"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "project_documents_qrToken_key" ON "project_documents"("qrToken");

-- CreateIndex
CREATE INDEX "project_documents_qrToken_idx" ON "project_documents"("qrToken");

-- CreateIndex
CREATE INDEX "project_document_versions_documentId_idx" ON "project_document_versions"("documentId");

-- CreateIndex
CREATE INDEX "project_events_projectId_idx" ON "project_events"("projectId");

-- CreateIndex
CREATE INDEX "project_events_scheduledAt_idx" ON "project_events"("scheduledAt");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "contract_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_categories" ADD CONSTRAINT "contract_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_payments" ADD CONSTRAINT "contract_payments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_payments" ADD CONSTRAINT "contract_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "project_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "project_folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_document_versions" ADD CONSTRAINT "project_document_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_document_versions" ADD CONSTRAINT "project_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "project_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
