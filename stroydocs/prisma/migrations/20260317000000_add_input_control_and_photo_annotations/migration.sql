-- CreateEnum
CREATE TYPE "InputControlResult" AS ENUM ('CONFORMING', 'NON_CONFORMING', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "InputControlActStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('CONFIRMING', 'VIOLATION');

-- AlterTable: добавить поля аннотаций и категории в фото
ALTER TABLE "photos" ADD COLUMN "annotations" JSONB,
ADD COLUMN "category" "PhotoCategory";

-- CreateTable: партии материалов
CREATE TABLE "material_batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "storageLocation" TEXT,
    "materialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: записи журнала входного контроля (ЖВК)
CREATE TABLE "input_control_records" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "result" "InputControlResult" NOT NULL,
    "notes" TEXT,
    "batchId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "input_control_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: акты входного контроля (АВК)
CREATE TABLE "input_control_acts" (
    "id" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "InputControlActStatus" NOT NULL DEFAULT 'DRAFT',
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "input_control_acts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_batches_materialId_idx" ON "material_batches"("materialId");

-- CreateIndex
CREATE INDEX "input_control_records_batchId_idx" ON "input_control_records"("batchId");

-- CreateIndex
CREATE INDEX "input_control_records_inspectorId_idx" ON "input_control_records"("inspectorId");

-- CreateIndex
CREATE INDEX "input_control_acts_recordId_idx" ON "input_control_acts"("recordId");

-- AddForeignKey
ALTER TABLE "material_batches" ADD CONSTRAINT "material_batches_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_control_records" ADD CONSTRAINT "input_control_records_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "material_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_control_records" ADD CONSTRAINT "input_control_records_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_control_acts" ADD CONSTRAINT "input_control_acts_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "input_control_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
