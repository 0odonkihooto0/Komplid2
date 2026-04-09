-- Модуль 13 — ТИМ (Технологии информационного моделирования)
-- BimSection, BimModel, BimModelVersion, BimElement, BimElementLink, BimAccess

-- CreateEnum
CREATE TYPE "BimModelStatus" AS ENUM ('PROCESSING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "BimModelStage" AS ENUM ('OTR', 'PROJECT', 'WORKING', 'CONSTRUCTION');

-- CreateEnum
CREATE TYPE "BimAccessLevel" AS ENUM ('VIEW', 'ADD', 'EDIT', 'DELETE');

-- CreateTable
CREATE TABLE "bim_sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bim_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "status" "BimModelStatus" NOT NULL DEFAULT 'PROCESSING',
    "stage" "BimModelStage",
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "sectionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "ifcVersion" TEXT,
    "elementCount" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bim_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_model_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "modelId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bim_model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_elements" (
    "id" TEXT NOT NULL,
    "ifcGuid" TEXT NOT NULL,
    "ifcType" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "layer" TEXT,
    "level" TEXT,
    "properties" JSONB,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "bim_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_element_links" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bim_element_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_access" (
    "id" TEXT NOT NULL,
    "level" "BimAccessLevel" NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" "BimModelStage",
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bim_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bim_sections_projectId_idx" ON "bim_sections"("projectId");

-- CreateIndex
CREATE INDEX "bim_sections_parentId_idx" ON "bim_sections"("parentId");

-- CreateIndex
CREATE INDEX "bim_models_projectId_idx" ON "bim_models"("projectId");

-- CreateIndex
CREATE INDEX "bim_models_sectionId_idx" ON "bim_models"("sectionId");

-- CreateIndex
CREATE INDEX "bim_models_projectId_isCurrent_idx" ON "bim_models"("projectId", "isCurrent");

-- CreateIndex
CREATE INDEX "bim_model_versions_modelId_idx" ON "bim_model_versions"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "bim_elements_modelId_ifcGuid_key" ON "bim_elements"("modelId", "ifcGuid");

-- CreateIndex
CREATE INDEX "bim_elements_modelId_idx" ON "bim_elements"("modelId");

-- CreateIndex
CREATE INDEX "bim_elements_ifcGuid_idx" ON "bim_elements"("ifcGuid");

-- CreateIndex
CREATE UNIQUE INDEX "bim_element_links_elementId_entityType_entityId_key" ON "bim_element_links"("elementId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "bim_element_links_elementId_idx" ON "bim_element_links"("elementId");

-- CreateIndex
CREATE INDEX "bim_element_links_entityType_entityId_idx" ON "bim_element_links"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "bim_element_links_modelId_idx" ON "bim_element_links"("modelId");

-- CreateIndex
CREATE INDEX "bim_access_projectId_idx" ON "bim_access"("projectId");

-- CreateIndex
CREATE INDEX "bim_access_userId_idx" ON "bim_access"("userId");

-- AddForeignKey
ALTER TABLE "bim_sections" ADD CONSTRAINT "bim_sections_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "bim_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_sections" ADD CONSTRAINT "bim_sections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_models" ADD CONSTRAINT "bim_models_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "bim_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_models" ADD CONSTRAINT "bim_models_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_models" ADD CONSTRAINT "bim_models_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_model_versions" ADD CONSTRAINT "bim_model_versions_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "bim_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_model_versions" ADD CONSTRAINT "bim_model_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_elements" ADD CONSTRAINT "bim_elements_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "bim_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_element_links" ADD CONSTRAINT "bim_element_links_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "bim_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_element_links" ADD CONSTRAINT "bim_element_links_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "bim_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_access" ADD CONSTRAINT "bim_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_access" ADD CONSTRAINT "bim_access_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
