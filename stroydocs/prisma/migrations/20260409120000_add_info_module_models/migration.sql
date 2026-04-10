-- Модуль «Информация» — ЦУС: земельные участки, ТУ, финансирование, риски, камеры, координаты, показатели

-- CreateEnum
CREATE TYPE "FundingRecordType" AS ENUM ('ALLOCATED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "IndicatorSource" AS ENUM ('MANUAL', 'AUTO');

-- CreateTable
CREATE TABLE "land_plots" (
    "id" TEXT NOT NULL,
    "cadastralNumber" TEXT NOT NULL,
    "address" TEXT,
    "area" DOUBLE PRECISION,
    "landCategory" TEXT,
    "permittedUse" TEXT,
    "cadastralValue" DOUBLE PRECISION,
    "status" TEXT,
    "ownershipForm" TEXT,
    "hasEncumbrances" BOOLEAN NOT NULL DEFAULT false,
    "encumbranceInfo" TEXT,
    "hasRestrictions" BOOLEAN NOT NULL DEFAULT false,
    "restrictionInfo" TEXT,
    "hasDemolitionObjects" BOOLEAN NOT NULL DEFAULT false,
    "demolitionInfo" TEXT,
    "inspectionDate" TIMESTAMP(3),
    "egrnNumber" TEXT,
    "hasPlacementPossibility" BOOLEAN NOT NULL DEFAULT false,
    "placementInfo" TEXT,
    "surveyInfo" TEXT,
    "gpzuNumber" TEXT,
    "gpzuDate" TIMESTAMP(3),
    "gpzuS3Key" TEXT,
    "projectId" TEXT NOT NULL,
    "ownerOrgId" TEXT,
    "tenantOrgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_plots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_conditions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "connectionAvailability" TEXT,
    "issueDate" TIMESTAMP(3),
    "number" TEXT,
    "expirationDate" TIMESTAMP(3),
    "issuingAuthority" TEXT,
    "connectionConditions" TEXT,
    "projectId" TEXT NOT NULL,
    "responsibleOrgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_records" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "recordType" "FundingRecordType" NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "federalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "regionalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "localBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownFunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funding_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limit_risks" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Активно',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "federalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "regionalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "localBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownFunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskReason" TEXT NOT NULL,
    "resolutionProposal" TEXT,
    "completionDate" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "limit_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_cameras" (
    "id" TEXT NOT NULL,
    "cameraNumber" TEXT,
    "locationName" TEXT,
    "operationalStatus" TEXT NOT NULL DEFAULT 'Работает',
    "cameraModel" TEXT,
    "rtspUrl" TEXT,
    "httpUrl" TEXT NOT NULL,
    "failureReason" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_coordinates" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "constructionPhase" INTEGER,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_coordinates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_indicators" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "indicatorName" TEXT NOT NULL,
    "value" TEXT,
    "comment" TEXT,
    "maxValue" TEXT,
    "sourceType" "IndicatorSource" NOT NULL DEFAULT 'MANUAL',
    "autoSourceField" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "land_plots_projectId_idx" ON "land_plots"("projectId");

-- CreateIndex
CREATE INDEX "technical_conditions_projectId_idx" ON "technical_conditions"("projectId");

-- CreateIndex
CREATE INDEX "funding_records_projectId_idx" ON "funding_records"("projectId");

-- CreateIndex
CREATE INDEX "limit_risks_projectId_idx" ON "limit_risks"("projectId");

-- CreateIndex
CREATE INDEX "video_cameras_projectId_idx" ON "video_cameras"("projectId");

-- CreateIndex
CREATE INDEX "project_coordinates_projectId_idx" ON "project_coordinates"("projectId");

-- CreateIndex
CREATE INDEX "project_indicators_projectId_groupName_idx" ON "project_indicators"("projectId", "groupName");

-- AddForeignKey
ALTER TABLE "land_plots" ADD CONSTRAINT "land_plots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_plots" ADD CONSTRAINT "land_plots_ownerOrgId_fkey" FOREIGN KEY ("ownerOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_plots" ADD CONSTRAINT "land_plots_tenantOrgId_fkey" FOREIGN KEY ("tenantOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_conditions" ADD CONSTRAINT "technical_conditions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_conditions" ADD CONSTRAINT "technical_conditions_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_records" ADD CONSTRAINT "funding_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limit_risks" ADD CONSTRAINT "limit_risks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limit_risks" ADD CONSTRAINT "limit_risks_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_cameras" ADD CONSTRAINT "video_cameras_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_cameras" ADD CONSTRAINT "video_cameras_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_coordinates" ADD CONSTRAINT "project_coordinates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_indicators" ADD CONSTRAINT "project_indicators_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
