-- CreateTable
CREATE TABLE "task_types_ref" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_types_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_categories_ref" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "requiresSuspension" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "defect_categories_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_issue_types_ref" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_issue_types_ref_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add categoryRefId to defects
ALTER TABLE "defects" ADD COLUMN "categoryRefId" TEXT;

-- AlterTable: add typeRefId to problem_issues
ALTER TABLE "problem_issues" ADD COLUMN "typeRefId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "task_types_ref_code_key" ON "task_types_ref"("code");

-- CreateIndex
CREATE INDEX "task_types_ref_organizationId_idx" ON "task_types_ref"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "defect_categories_ref_code_key" ON "defect_categories_ref"("code");

-- CreateIndex
CREATE INDEX "defect_categories_ref_organizationId_idx" ON "defect_categories_ref"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "problem_issue_types_ref_code_key" ON "problem_issue_types_ref"("code");

-- CreateIndex
CREATE INDEX "problem_issue_types_ref_organizationId_idx" ON "problem_issue_types_ref"("organizationId");

-- CreateIndex
CREATE INDEX "defects_categoryRefId_idx" ON "defects"("categoryRefId");

-- CreateIndex
CREATE INDEX "problem_issues_typeRefId_idx" ON "problem_issues"("typeRefId");

-- AddForeignKey
ALTER TABLE "task_types_ref" ADD CONSTRAINT "task_types_ref_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_categories_ref" ADD CONSTRAINT "defect_categories_ref_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_issue_types_ref" ADD CONSTRAINT "problem_issue_types_ref_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_categoryRefId_fkey" FOREIGN KEY ("categoryRefId") REFERENCES "defect_categories_ref"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_issues" ADD CONSTRAINT "problem_issues_typeRefId_fkey" FOREIGN KEY ("typeRefId") REFERENCES "problem_issue_types_ref"("id") ON DELETE SET NULL ON UPDATE CASCADE;
