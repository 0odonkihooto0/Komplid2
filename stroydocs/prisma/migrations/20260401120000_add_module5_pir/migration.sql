-- CreateEnum
CREATE TYPE "DesignTaskType" AS ENUM ('DESIGN', 'SURVEY');

-- CreateEnum
CREATE TYPE "DesignTaskStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SENT_FOR_REVIEW', 'WITH_COMMENTS', 'REVIEW_PASSED', 'IN_APPROVAL', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DesignDocType" AS ENUM ('DESIGN_PD', 'WORKING_RD', 'SURVEY', 'REPEATED_USE');

-- CreateEnum
CREATE TYPE "DesignDocStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'SENT_FOR_REVIEW', 'WITH_COMMENTS', 'REVIEW_PASSED', 'IN_APPROVAL', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DesignCommentStatus" AS ENUM ('ACTIVE', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ExpertiseStatus" AS ENUM ('NOT_SUBMITTED', 'IN_PROCESS', 'APPROVED_POSITIVE', 'APPROVED_NEGATIVE', 'REVISION_REQUIRED');

-- CreateEnum
CREATE TYPE "PIRClosureStatus" AS ENUM ('DRAFT', 'CONDUCTED', 'IN_APPROVAL', 'SIGNED');

-- CreateTable
CREATE TABLE "design_tasks" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "docDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskType" "DesignTaskType" NOT NULL DEFAULT 'DESIGN',
    "status" "DesignTaskStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "agreedById" TEXT,
    "customerOrgId" TEXT,
    "customerPersonId" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "s3Keys" TEXT[],
    "approvalRouteId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_task_params" (
    "id" TEXT NOT NULL,
    "paramKey" TEXT NOT NULL,
    "paramName" TEXT NOT NULL,
    "value" TEXT,
    "order" INTEGER NOT NULL,
    "hasComment" BOOLEAN NOT NULL DEFAULT false,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "design_task_params_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_task_comments" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "DesignCommentStatus" NOT NULL DEFAULT 'ACTIVE',
    "paramKey" TEXT,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedById" TEXT,
    "s3Keys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_documents" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "docType" "DesignDocType" NOT NULL,
    "category" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DesignDocStatus" NOT NULL DEFAULT 'CREATED',
    "responsibleOrgId" TEXT,
    "responsibleUserId" TEXT,
    "notes" TEXT,
    "linkedExecDocIds" TEXT[],
    "qrToken" TEXT,
    "qrCodeS3Key" TEXT,
    "expertiseStatus" "ExpertiseStatus",
    "expertiseDate" TIMESTAMP(3),
    "expertiseComment" TEXT,
    "s3Keys" TEXT[],
    "currentS3Key" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "parentDocId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_doc_comments" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "commentType" TEXT,
    "urgency" TEXT,
    "deadline" TIMESTAMP(3),
    "status" "DesignCommentStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiresAttention" BOOLEAN NOT NULL DEFAULT false,
    "docId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedById" TEXT,
    "s3Keys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_doc_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_registries" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "senderOrgId" TEXT,
    "receiverOrgId" TEXT,
    "senderPersonId" TEXT,
    "receiverPersonId" TEXT,
    "notes" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "expertiseStatus" "ExpertiseStatus",
    "expertiseDate" TIMESTAMP(3),
    "expertiseS3Keys" TEXT[],
    "expertiseComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pir_registries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_registry_items" (
    "id" TEXT NOT NULL,
    "registryId" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pir_registry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_closure_acts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "PIRClosureStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "ganttVersionId" TEXT,
    "contractorOrgId" TEXT,
    "customerOrgId" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "s3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pir_closure_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_closure_items" (
    "id" TEXT NOT NULL,
    "actId" TEXT NOT NULL,
    "workName" TEXT NOT NULL,
    "unit" TEXT,
    "volume" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,

    CONSTRAINT "pir_closure_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "design_tasks_approvalRouteId_key" ON "design_tasks"("approvalRouteId");

-- CreateIndex
CREATE INDEX "design_tasks_projectId_idx" ON "design_tasks"("projectId");

-- CreateIndex
CREATE INDEX "design_tasks_taskType_idx" ON "design_tasks"("taskType");

-- CreateIndex
CREATE INDEX "design_task_params_taskId_idx" ON "design_task_params"("taskId");

-- CreateIndex
CREATE INDEX "design_task_comments_taskId_idx" ON "design_task_comments"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "design_documents_qrToken_key" ON "design_documents"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "design_documents_approvalRouteId_key" ON "design_documents"("approvalRouteId");

-- CreateIndex
CREATE INDEX "design_documents_projectId_idx" ON "design_documents"("projectId");

-- CreateIndex
CREATE INDEX "design_documents_docType_idx" ON "design_documents"("docType");

-- CreateIndex
CREATE INDEX "design_documents_status_idx" ON "design_documents"("status");

-- CreateIndex
CREATE INDEX "design_documents_qrToken_idx" ON "design_documents"("qrToken");

-- CreateIndex
CREATE INDEX "design_doc_comments_docId_idx" ON "design_doc_comments"("docId");

-- CreateIndex
CREATE INDEX "pir_registries_projectId_idx" ON "pir_registries"("projectId");

-- CreateIndex
CREATE INDEX "pir_registry_items_registryId_idx" ON "pir_registry_items"("registryId");

-- CreateIndex
CREATE UNIQUE INDEX "pir_closure_acts_approvalRouteId_key" ON "pir_closure_acts"("approvalRouteId");

-- CreateIndex
CREATE INDEX "pir_closure_acts_projectId_idx" ON "pir_closure_acts"("projectId");

-- CreateIndex
CREATE INDEX "pir_closure_items_actId_idx" ON "pir_closure_items"("actId");

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_agreedById_fkey" FOREIGN KEY ("agreedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_customerOrgId_fkey" FOREIGN KEY ("customerOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_customerPersonId_fkey" FOREIGN KEY ("customerPersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_task_params" ADD CONSTRAINT "design_task_params_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "design_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_task_comments" ADD CONSTRAINT "design_task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "design_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_task_comments" ADD CONSTRAINT "design_task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_task_comments" ADD CONSTRAINT "design_task_comments_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_task_comments" ADD CONSTRAINT "design_task_comments_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_parentDocId_fkey" FOREIGN KEY ("parentDocId") REFERENCES "design_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_doc_comments" ADD CONSTRAINT "design_doc_comments_docId_fkey" FOREIGN KEY ("docId") REFERENCES "design_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_doc_comments" ADD CONSTRAINT "design_doc_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_doc_comments" ADD CONSTRAINT "design_doc_comments_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_doc_comments" ADD CONSTRAINT "design_doc_comments_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_senderOrgId_fkey" FOREIGN KEY ("senderOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_receiverOrgId_fkey" FOREIGN KEY ("receiverOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_senderPersonId_fkey" FOREIGN KEY ("senderPersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_receiverPersonId_fkey" FOREIGN KEY ("receiverPersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registry_items" ADD CONSTRAINT "pir_registry_items_registryId_fkey" FOREIGN KEY ("registryId") REFERENCES "pir_registries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registry_items" ADD CONSTRAINT "pir_registry_items_docId_fkey" FOREIGN KEY ("docId") REFERENCES "design_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_closure_acts" ADD CONSTRAINT "pir_closure_acts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_closure_acts" ADD CONSTRAINT "pir_closure_acts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_closure_acts" ADD CONSTRAINT "pir_closure_acts_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_closure_items" ADD CONSTRAINT "pir_closure_items_actId_fkey" FOREIGN KEY ("actId") REFERENCES "pir_closure_acts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
