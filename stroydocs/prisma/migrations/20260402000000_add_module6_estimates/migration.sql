-- CreateEnum
CREATE TYPE "EstimateVersionType" AS ENUM ('BASELINE', 'ACTUAL', 'CORRECTIVE');

-- CreateTable
CREATE TABLE "estimate_versions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "versionType" "EstimateVersionType" NOT NULL DEFAULT 'ACTUAL',
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "isActual" BOOLEAN NOT NULL DEFAULT true,
    "period" TEXT,
    "notes" TEXT,
    "sourceImportId" TEXT,
    "parentVersionId" TEXT,
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "totalLabor" DOUBLE PRECISION,
    "totalMat" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_chapters" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "versionId" TEXT NOT NULL,
    "parentId" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "totalLabor" DOUBLE PRECISION,
    "totalMat" DOUBLE PRECISION,

    CONSTRAINT "estimate_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_items" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "itemType" "EstimateItemType" NOT NULL DEFAULT 'WORK',
    "code" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "volume" DOUBLE PRECISION,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "laborCost" DOUBLE PRECISION,
    "materialCost" DOUBLE PRECISION,
    "machineryCost" DOUBLE PRECISION,
    "priceIndex" DOUBLE PRECISION DEFAULT 1.0,
    "overhead" DOUBLE PRECISION,
    "profit" DOUBLE PRECISION,
    "ksiNodeId" TEXT,
    "workItemId" TEXT,
    "importItemId" TEXT,
    "chapterId" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_contracts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_contract_versions" (
    "id" TEXT NOT NULL,
    "estimateContractId" TEXT NOT NULL,
    "estimateVersionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "estimate_contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_versions_contractId_idx" ON "estimate_versions"("contractId");

-- CreateIndex
CREATE INDEX "estimate_versions_parentVersionId_idx" ON "estimate_versions"("parentVersionId");

-- CreateIndex
CREATE INDEX "estimate_chapters_versionId_idx" ON "estimate_chapters"("versionId");

-- CreateIndex
CREATE INDEX "estimate_chapters_parentId_idx" ON "estimate_chapters"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "estimate_items_importItemId_key" ON "estimate_items"("importItemId");

-- CreateIndex
CREATE INDEX "estimate_items_chapterId_idx" ON "estimate_items"("chapterId");

-- CreateIndex
CREATE INDEX "estimate_items_ksiNodeId_idx" ON "estimate_items"("ksiNodeId");

-- CreateIndex
CREATE INDEX "estimate_items_workItemId_idx" ON "estimate_items"("workItemId");

-- CreateIndex
CREATE INDEX "estimate_contracts_contractId_idx" ON "estimate_contracts"("contractId");

-- CreateIndex
CREATE INDEX "estimate_contract_versions_estimateContractId_idx" ON "estimate_contract_versions"("estimateContractId");

-- CreateIndex
CREATE INDEX "estimate_contract_versions_estimateVersionId_idx" ON "estimate_contract_versions"("estimateVersionId");

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_sourceImportId_fkey" FOREIGN KEY ("sourceImportId") REFERENCES "estimate_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "estimate_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_chapters" ADD CONSTRAINT "estimate_chapters_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "estimate_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_chapters" ADD CONSTRAINT "estimate_chapters_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "estimate_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_ksiNodeId_fkey" FOREIGN KEY ("ksiNodeId") REFERENCES "ksi_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_importItemId_fkey" FOREIGN KEY ("importItemId") REFERENCES "estimate_import_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "estimate_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_contracts" ADD CONSTRAINT "estimate_contracts_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_contracts" ADD CONSTRAINT "estimate_contracts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_contract_versions" ADD CONSTRAINT "estimate_contract_versions_estimateContractId_fkey" FOREIGN KEY ("estimateContractId") REFERENCES "estimate_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_contract_versions" ADD CONSTRAINT "estimate_contract_versions_estimateVersionId_fkey" FOREIGN KEY ("estimateVersionId") REFERENCES "estimate_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
