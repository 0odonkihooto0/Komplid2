-- AlterTable: добавить поля unit, volume, normatives в work_items
ALTER TABLE "work_items" ADD COLUMN "unit" TEXT;
ALTER TABLE "work_items" ADD COLUMN "volume" DOUBLE PRECISION;
ALTER TABLE "work_items" ADD COLUMN "normatives" TEXT;
