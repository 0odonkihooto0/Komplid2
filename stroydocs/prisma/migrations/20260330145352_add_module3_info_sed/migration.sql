-- CreateEnum
CREATE TYPE "DocTemplateCategory" AS ENUM ('AOSR', 'OZR', 'KS2', 'KS3', 'AVK', 'ZHVK', 'TECH_READINESS', 'OTHER');

-- CreateEnum
CREATE TYPE "CorrespondenceDir" AS ENUM ('OUTGOING', 'INCOMING');

-- CreateEnum
CREATE TYPE "CorrespondenceStatus" AS ENUM ('DRAFT', 'SENT', 'READ', 'IN_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RFIStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ANSWERED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RFIPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SEDDocType" AS ENUM ('LETTER', 'ORDER', 'PROTOCOL', 'ACT', 'MEMO', 'NOTIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SEDStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_APPROVAL', 'REQUIRES_ACTION', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "PhotoEntityType" ADD VALUE 'DEFECT';

-- DropForeignKey
ALTER TABLE "work_items" DROP CONSTRAINT "work_items_ksiNodeId_fkey";

-- AlterTable
ALTER TABLE "approval_routes" ADD COLUMN     "documentType" TEXT,
ALTER COLUMN "executionDocId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "building_objects" RENAME CONSTRAINT "projects_pkey" TO "building_objects_pkey";

-- AlterTable
ALTER TABLE "estimate_import_items" ALTER COLUMN "normativeRefs" DROP DEFAULT;

-- AlterTable
ALTER TABLE "execution_docs" ADD COLUMN     "lastEditedAt" TIMESTAMP(3),
ADD COLUMN     "lastEditedById" TEXT,
ADD COLUMN     "overrideFields" JSONB,
ADD COLUMN     "overrideHtml" TEXT;

-- AlterTable
ALTER TABLE "ksi_nodes" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DocTemplateCategory" NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'docx',
    "localPath" TEXT,
    "s3Key" TEXT,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "colSpan" INTEGER NOT NULL DEFAULT 1,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correspondences" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "direction" "CorrespondenceDir" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "status" "CorrespondenceStatus" NOT NULL DEFAULT 'DRAFT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "tags" TEXT[],
    "projectId" TEXT NOT NULL,
    "senderOrgId" TEXT NOT NULL,
    "receiverOrgId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "searchVector" tsvector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "correspondences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correspondence_attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correspondenceId" TEXT NOT NULL,

    CONSTRAINT "correspondence_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfis" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RFIStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "RFIPriority" NOT NULL DEFAULT 'MEDIUM',
    "deadline" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "linkedDocId" TEXT,
    "linkedDocType" TEXT,
    "response" TEXT,
    "answeredAt" TIMESTAMP(3),
    "answeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfi_attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rfiId" TEXT NOT NULL,

    CONSTRAINT "rfi_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_documents" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "docType" "SEDDocType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" "SEDStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[],
    "projectId" TEXT NOT NULL,
    "senderOrgId" TEXT NOT NULL,
    "receiverOrgIds" TEXT[],
    "authorId" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "searchVector" tsvector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sed_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sedDocId" TEXT NOT NULL,

    CONSTRAINT "sed_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "authorId" TEXT NOT NULL,
    "attachmentType" TEXT,
    "attachmentId" TEXT,
    "replyToId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_templates_category_idx" ON "document_templates"("category");

-- CreateIndex
CREATE INDEX "document_templates_organizationId_idx" ON "document_templates"("organizationId");

-- CreateIndex
CREATE INDEX "dashboard_widgets_userId_idx" ON "dashboard_widgets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "correspondences_approvalRouteId_key" ON "correspondences"("approvalRouteId");

-- CreateIndex
CREATE INDEX "correspondences_projectId_idx" ON "correspondences"("projectId");

-- CreateIndex
CREATE INDEX "correspondences_direction_idx" ON "correspondences"("direction");

-- CreateIndex
CREATE INDEX "correspondences_status_idx" ON "correspondences"("status");

-- CreateIndex
CREATE INDEX "correspondence_attachments_correspondenceId_idx" ON "correspondence_attachments"("correspondenceId");

-- CreateIndex
CREATE INDEX "rfis_projectId_idx" ON "rfis"("projectId");

-- CreateIndex
CREATE INDEX "rfis_assigneeId_idx" ON "rfis"("assigneeId");

-- CreateIndex
CREATE INDEX "rfis_status_idx" ON "rfis"("status");

-- CreateIndex
CREATE INDEX "rfi_attachments_rfiId_idx" ON "rfi_attachments"("rfiId");

-- CreateIndex
CREATE UNIQUE INDEX "sed_documents_approvalRouteId_key" ON "sed_documents"("approvalRouteId");

-- CreateIndex
CREATE INDEX "sed_documents_projectId_idx" ON "sed_documents"("projectId");

-- CreateIndex
CREATE INDEX "sed_documents_status_idx" ON "sed_documents"("status");

-- CreateIndex
CREATE INDEX "sed_documents_docType_idx" ON "sed_documents"("docType");

-- CreateIndex
CREATE INDEX "sed_attachments_sedDocId_idx" ON "sed_attachments"("sedDocId");

-- CreateIndex
CREATE INDEX "chat_messages_projectId_createdAt_idx" ON "chat_messages"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_contractId_createdAt_idx" ON "chat_messages"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "doc_comments_resolvedById_idx" ON "doc_comments"("resolvedById");

-- CreateIndex
CREATE INDEX "execution_docs_lastEditedById_idx" ON "execution_docs"("lastEditedById");

-- CreateIndex
CREATE INDEX "execution_docs_status_idx" ON "execution_docs"("status");

-- CreateIndex
CREATE INDEX "work_records_date_idx" ON "work_records"("date");

-- RenameForeignKey
ALTER TABLE "building_objects" RENAME CONSTRAINT "projects_organizationId_fkey" TO "building_objects_organizationId_fkey";

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_ksiNodeId_fkey" FOREIGN KEY ("ksiNodeId") REFERENCES "ksi_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_docs" ADD CONSTRAINT "execution_docs_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_senderOrgId_fkey" FOREIGN KEY ("senderOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_receiverOrgId_fkey" FOREIGN KEY ("receiverOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_attachments" ADD CONSTRAINT "correspondence_attachments_correspondenceId_fkey" FOREIGN KEY ("correspondenceId") REFERENCES "correspondences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfi_attachments" ADD CONSTRAINT "rfi_attachments_rfiId_fkey" FOREIGN KEY ("rfiId") REFERENCES "rfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_senderOrgId_fkey" FOREIGN KEY ("senderOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_attachments" ADD CONSTRAINT "sed_attachments_sedDocId_fkey" FOREIGN KEY ("sedDocId") REFERENCES "sed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "projects_organizationId_idx" RENAME TO "building_objects_organizationId_idx";

-- Полнотекстовый поиск для таблицы correspondences (Модуль 3)
ALTER TABLE "correspondences"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('russian', coalesce(subject, '') || ' ' || coalesce(body, '') || ' ' || number)
  ) STORED;
CREATE INDEX "idx_correspondence_search" ON "correspondences" USING GIN("search_vector");

-- Полнотекстовый поиск для таблицы sed_documents (Модуль 3)
ALTER TABLE "sed_documents"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(body, '') || ' ' || number)
  ) STORED;
CREATE INDEX "idx_sed_search" ON "sed_documents" USING GIN("search_vector");
