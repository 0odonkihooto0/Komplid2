-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'WORKER', 'CONTROLLER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MAIN', 'SUBCONTRACT');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('DEVELOPER', 'CONTRACTOR', 'SUPERVISION', 'SUBCONTRACTOR');

-- CreateEnum
CREATE TYPE "MaterialDocumentType" AS ENUM ('PASSPORT', 'CERTIFICATE', 'PROTOCOL');

-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('PIECE', 'KG', 'TON', 'M', 'M2', 'M3', 'L', 'SET');

-- CreateEnum
CREATE TYPE "WorkRecordStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExecutionDocType" AS ENUM ('AOSR', 'OZR', 'TECHNICAL_READINESS_ACT');

-- CreateEnum
CREATE TYPE "ExecutionDocStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('DETACHED', 'EMBEDDED');

-- CreateEnum
CREATE TYPE "DocCommentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ArchiveCategory" AS ENUM ('PERMITS', 'WORKING_PROJECT', 'EXECUTION_DRAWINGS', 'CERTIFICATES', 'STANDARDS');

-- CreateEnum
CREATE TYPE "EstimateFormat" AS ENUM ('XML_GRAND_SMETA', 'XML_RIK', 'EXCEL', 'PDF');

-- CreateEnum
CREATE TYPE "EstimateImportStatus" AS ENUM ('UPLOADING', 'PARSING', 'AI_PROCESSING', 'PREVIEW', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "EstimateItemStatus" AS ENUM ('RECOGNIZED', 'MAPPED', 'UNMATCHED', 'SKIPPED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "PhotoEntityType" AS ENUM ('WORK_RECORD', 'MATERIAL', 'REMARK', 'WORK_ITEM');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inn" TEXT NOT NULL,
    "ogrn" TEXT,
    "sroName" TEXT,
    "sroNumber" TEXT,
    "sroInn" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'WORKER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'WORKER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "organizationId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "generalContractor" TEXT,
    "customer" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContractType" NOT NULL DEFAULT 'MAIN',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_participants" (
    "id" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "appointmentOrder" TEXT,
    "appointmentDate" TIMESTAMP(3),
    "contractId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ksi_nodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ksi_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "projectCipher" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ksiNodeId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplier" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "unit" "MeasurementUnit" NOT NULL DEFAULT 'PIECE',
    "quantityReceived" DOUBLE PRECISION NOT NULL,
    "quantityUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_documents" (
    "id" TEXT NOT NULL,
    "type" "MaterialDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "materialId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_records" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "normative" TEXT,
    "status" "WorkRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "workItemId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_writeoffs" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "workRecordId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_writeoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "entityType" "PhotoEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "takenAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_docs" (
    "id" TEXT NOT NULL,
    "type" "ExecutionDocType" NOT NULL,
    "status" "ExecutionDocStatus" NOT NULL DEFAULT 'DRAFT',
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "s3Key" TEXT,
    "fileName" TEXT,
    "generatedAt" TIMESTAMP(3),
    "contractId" TEXT NOT NULL,
    "workRecordId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "execution_docs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" TEXT NOT NULL,
    "signatureType" "SignatureType" NOT NULL,
    "s3Key" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "executionDocId" TEXT NOT NULL,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_comments" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "status" "DocCommentStatus" NOT NULL DEFAULT 'OPEN',
    "executionDocId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archive_documents" (
    "id" TEXT NOT NULL,
    "category" "ArchiveCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sheetNumber" TEXT,
    "cipher" TEXT,
    "issueDate" TIMESTAMP(3),
    "certifiedCopy" BOOLEAN NOT NULL DEFAULT false,
    "certifiedByName" TEXT,
    "certifiedByPos" TEXT,
    "certifiedS3Key" TEXT,
    "contractId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archive_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_imports" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileS3Key" TEXT NOT NULL,
    "fileHash" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "format" "EstimateFormat",
    "status" "EstimateImportStatus" NOT NULL DEFAULT 'UPLOADING',
    "errorMessage" TEXT,
    "parsedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "itemsTotal" INTEGER NOT NULL DEFAULT 0,
    "itemsMapped" INTEGER NOT NULL DEFAULT 0,
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_import_items" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "rawName" TEXT NOT NULL,
    "rawUnit" TEXT,
    "volume" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "status" "EstimateItemStatus" NOT NULL DEFAULT 'RECOGNIZED',
    "suggestedKsiNodeId" TEXT,
    "workItemId" TEXT,
    "importId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_import_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_inn_key" ON "organizations"("inn");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_ogrn_key" ON "organizations"("ogrn");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_organizationId_idx" ON "invitations"("organizationId");

-- CreateIndex
CREATE INDEX "invitations_invitedById_idx" ON "invitations"("invitedById");

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- CreateIndex
CREATE INDEX "contracts_projectId_idx" ON "contracts"("projectId");

-- CreateIndex
CREATE INDEX "contracts_parentId_idx" ON "contracts"("parentId");

-- CreateIndex
CREATE INDEX "contract_participants_contractId_idx" ON "contract_participants"("contractId");

-- CreateIndex
CREATE INDEX "contract_participants_organizationId_idx" ON "contract_participants"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_participants_contractId_organizationId_role_key" ON "contract_participants"("contractId", "organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ksi_nodes_code_key" ON "ksi_nodes"("code");

-- CreateIndex
CREATE INDEX "work_items_contractId_idx" ON "work_items"("contractId");

-- CreateIndex
CREATE INDEX "work_items_ksiNodeId_idx" ON "work_items"("ksiNodeId");

-- CreateIndex
CREATE INDEX "materials_contractId_idx" ON "materials"("contractId");

-- CreateIndex
CREATE INDEX "material_documents_materialId_idx" ON "material_documents"("materialId");

-- CreateIndex
CREATE INDEX "work_records_contractId_idx" ON "work_records"("contractId");

-- CreateIndex
CREATE INDEX "work_records_workItemId_idx" ON "work_records"("workItemId");

-- CreateIndex
CREATE INDEX "material_writeoffs_workRecordId_idx" ON "material_writeoffs"("workRecordId");

-- CreateIndex
CREATE INDEX "material_writeoffs_materialId_idx" ON "material_writeoffs"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "material_writeoffs_workRecordId_materialId_key" ON "material_writeoffs"("workRecordId", "materialId");

-- CreateIndex
CREATE INDEX "photos_entityType_entityId_idx" ON "photos"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "photos_authorId_idx" ON "photos"("authorId");

-- CreateIndex
CREATE INDEX "execution_docs_contractId_idx" ON "execution_docs"("contractId");

-- CreateIndex
CREATE INDEX "execution_docs_workRecordId_idx" ON "execution_docs"("workRecordId");

-- CreateIndex
CREATE INDEX "execution_docs_createdById_idx" ON "execution_docs"("createdById");

-- CreateIndex
CREATE INDEX "signatures_userId_idx" ON "signatures"("userId");

-- CreateIndex
CREATE INDEX "signatures_executionDocId_idx" ON "signatures"("executionDocId");

-- CreateIndex
CREATE UNIQUE INDEX "signatures_executionDocId_userId_key" ON "signatures"("executionDocId", "userId");

-- CreateIndex
CREATE INDEX "doc_comments_executionDocId_idx" ON "doc_comments"("executionDocId");

-- CreateIndex
CREATE INDEX "doc_comments_authorId_idx" ON "doc_comments"("authorId");

-- CreateIndex
CREATE INDEX "archive_documents_contractId_idx" ON "archive_documents"("contractId");

-- CreateIndex
CREATE INDEX "archive_documents_uploadedById_idx" ON "archive_documents"("uploadedById");

-- CreateIndex
CREATE INDEX "estimate_imports_contractId_idx" ON "estimate_imports"("contractId");

-- CreateIndex
CREATE INDEX "estimate_imports_createdById_idx" ON "estimate_imports"("createdById");

-- CreateIndex
CREATE INDEX "estimate_import_items_importId_idx" ON "estimate_import_items"("importId");

-- CreateIndex
CREATE INDEX "estimate_import_items_suggestedKsiNodeId_idx" ON "estimate_import_items"("suggestedKsiNodeId");

-- CreateIndex
CREATE INDEX "estimate_import_items_workItemId_idx" ON "estimate_import_items"("workItemId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_participants" ADD CONSTRAINT "contract_participants_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_participants" ADD CONSTRAINT "contract_participants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ksi_nodes" ADD CONSTRAINT "ksi_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ksi_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_ksiNodeId_fkey" FOREIGN KEY ("ksiNodeId") REFERENCES "ksi_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_documents" ADD CONSTRAINT "material_documents_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_writeoffs" ADD CONSTRAINT "material_writeoffs_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "work_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_writeoffs" ADD CONSTRAINT "material_writeoffs_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_docs" ADD CONSTRAINT "execution_docs_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_docs" ADD CONSTRAINT "execution_docs_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "work_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_docs" ADD CONSTRAINT "execution_docs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_executionDocId_fkey" FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_comments" ADD CONSTRAINT "doc_comments_executionDocId_fkey" FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_comments" ADD CONSTRAINT "doc_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_comments" ADD CONSTRAINT "doc_comments_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_documents" ADD CONSTRAINT "archive_documents_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_documents" ADD CONSTRAINT "archive_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_imports" ADD CONSTRAINT "estimate_imports_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_imports" ADD CONSTRAINT "estimate_imports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_import_items" ADD CONSTRAINT "estimate_import_items_suggestedKsiNodeId_fkey" FOREIGN KEY ("suggestedKsiNodeId") REFERENCES "ksi_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_import_items" ADD CONSTRAINT "estimate_import_items_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_import_items" ADD CONSTRAINT "estimate_import_items_importId_fkey" FOREIGN KEY ("importId") REFERENCES "estimate_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

