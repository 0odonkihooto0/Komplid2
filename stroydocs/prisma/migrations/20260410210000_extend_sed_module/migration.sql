-- CreateEnum
CREATE TYPE "SEDWorkflowStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('DELEGATION', 'APPROVAL', 'REDIRECT', 'MULTI_APPROVAL', 'MULTI_SIGNING', 'DIGITAL_SIGNING', 'REVIEW');

-- AlterTable
ALTER TABLE "sed_documents" ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "incomingNumber" TEXT,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "observers" TEXT[],
ADD COLUMN     "outgoingNumber" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "receiverOrgId" TEXT,
ADD COLUMN     "receiverUserId" TEXT,
ADD COLUMN     "senderUserId" TEXT;

-- CreateTable
CREATE TABLE "sed_document_bases" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "basisWorkflowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sed_document_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_document_folders" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sed_document_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sed_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_links" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sed_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_workflow_messages" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sed_workflow_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_workflows" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "workflowType" "WorkflowType" NOT NULL,
    "status" "SEDWorkflowStatus" NOT NULL DEFAULT 'CREATED',
    "documentId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "participants" TEXT[],
    "observers" TEXT[],
    "approvalRouteId" TEXT,
    "regulationId" TEXT,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sed_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_regulations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "stepsTemplate" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_regulations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sed_document_bases_workflowId_idx" ON "sed_document_bases"("workflowId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sed_document_folders_documentId_folderId_key" ON "sed_document_folders"("documentId" ASC, "folderId" ASC);

-- CreateIndex
CREATE INDEX "sed_folders_projectId_idx" ON "sed_folders"("projectId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sed_links_documentId_entityType_entityId_key" ON "sed_links"("documentId" ASC, "entityType" ASC, "entityId" ASC);

-- CreateIndex
CREATE INDEX "sed_links_documentId_idx" ON "sed_links"("documentId" ASC);

-- CreateIndex
CREATE INDEX "sed_workflow_messages_workflowId_idx" ON "sed_workflow_messages"("workflowId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sed_workflows_approvalRouteId_key" ON "sed_workflows"("approvalRouteId" ASC);

-- CreateIndex
CREATE INDEX "sed_workflows_documentId_idx" ON "sed_workflows"("documentId" ASC);

-- CreateIndex
CREATE INDEX "workflow_regulations_organizationId_idx" ON "workflow_regulations"("organizationId" ASC);

-- AddForeignKey
ALTER TABLE "sed_document_bases" ADD CONSTRAINT "sed_document_bases_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "sed_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_document_folders" ADD CONSTRAINT "sed_document_folders_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "sed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_document_folders" ADD CONSTRAINT "sed_document_folders_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "sed_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_receiverOrgId_fkey" FOREIGN KEY ("receiverOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_folders" ADD CONSTRAINT "sed_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "sed_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_folders" ADD CONSTRAINT "sed_folders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_links" ADD CONSTRAINT "sed_links_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "sed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflow_messages" ADD CONSTRAINT "sed_workflow_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflow_messages" ADD CONSTRAINT "sed_workflow_messages_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "sed_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflows" ADD CONSTRAINT "sed_workflows_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflows" ADD CONSTRAINT "sed_workflows_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "sed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflows" ADD CONSTRAINT "sed_workflows_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflows" ADD CONSTRAINT "sed_workflows_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "workflow_regulations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_regulations" ADD CONSTRAINT "workflow_regulations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
