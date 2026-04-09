-- AlterTable: add normativeRefs to estimate_import_items
ALTER TABLE "estimate_import_items" ADD COLUMN "normativeRefs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
