-- Модуль 12 — Отчёты (ЦУС стр. 290–296)
-- ReportCategory, Report, ReportBlock, ReportTemplate, ThematicReportConfig

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'SIGNED');

-- CreateEnum
CREATE TYPE "ReportBlockType" AS ENUM ('TITLE_PAGE', 'WORK_VOLUMES', 'KS2_ACTS', 'ID_STATUS', 'DEFECTS_SUMMARY', 'GPR_PROGRESS', 'PHOTO_REPORT', 'FUNDING_STATUS', 'DAILY_LOG_SUMMARY', 'FREE_TEXT', 'CUSTOM_TABLE');

-- CreateTable
CREATE TABLE "report_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "blockDefinitions" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "categoryId" TEXT,
    "templateId" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "pdfS3Key" TEXT,
    "xlsxS3Key" TEXT,
    "fileName" TEXT,
    "approvalRouteId" TEXT,
    "s3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_blocks" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "ReportBlockType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "isAutoFilled" BOOLEAN NOT NULL DEFAULT false,
    "s3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thematic_report_configs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "availableColumns" JSONB NOT NULL,
    "defaultColumns" JSONB NOT NULL,
    "dataSource" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thematic_report_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_categories_projectId_idx" ON "report_categories"("projectId");

-- CreateIndex
CREATE INDEX "report_templates_organizationId_idx" ON "report_templates"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_approvalRouteId_key" ON "reports"("approvalRouteId");

-- CreateIndex
CREATE INDEX "reports_projectId_idx" ON "reports"("projectId");

-- CreateIndex
CREATE INDEX "reports_categoryId_idx" ON "reports"("categoryId");

-- CreateIndex
CREATE INDEX "reports_authorId_idx" ON "reports"("authorId");

-- CreateIndex
CREATE INDEX "report_blocks_reportId_idx" ON "report_blocks"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "thematic_report_configs_slug_key" ON "thematic_report_configs"("slug");

-- AddForeignKey
ALTER TABLE "report_categories" ADD CONSTRAINT "report_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "report_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_categories" ADD CONSTRAINT "report_categories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "report_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "report_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_blocks" ADD CONSTRAINT "report_blocks_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
