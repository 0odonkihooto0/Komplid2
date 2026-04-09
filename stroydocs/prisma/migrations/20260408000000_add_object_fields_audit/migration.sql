-- Расширенные реквизиты BuildingObject: тип строительства, регион, геолокация, даты, иерархия объектов

-- AlterTable
ALTER TABLE "building_objects"
ADD COLUMN "constructionType" TEXT,
ADD COLUMN "region"           TEXT,
ADD COLUMN "stroyka"          TEXT,
ADD COLUMN "shortName"        TEXT,
ADD COLUMN "latitude"         DOUBLE PRECISION,
ADD COLUMN "longitude"        DOUBLE PRECISION,
ADD COLUMN "actualStartDate"  TIMESTAMP(3),
ADD COLUMN "actualEndDate"    TIMESTAMP(3),
ADD COLUMN "fillDatesFromGpr" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "parentId"         TEXT;

-- CreateIndex
CREATE INDEX "building_objects_parentId_idx" ON "building_objects"("parentId");

-- CreateIndex
CREATE INDEX "building_objects_region_idx" ON "building_objects"("region");

-- AddForeignKey
ALTER TABLE "building_objects" ADD CONSTRAINT "building_objects_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "building_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
