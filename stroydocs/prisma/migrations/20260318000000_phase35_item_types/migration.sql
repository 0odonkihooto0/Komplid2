-- Миграция Фазы 3.5: добавление типа позиции сметы и иерархии материал→работа

-- Создание перечисления типов позиций
CREATE TYPE "EstimateItemType" AS ENUM ('WORK', 'MATERIAL');

-- Добавление колонки типа позиции (по умолчанию WORK для всех существующих записей)
ALTER TABLE "estimate_import_items"
  ADD COLUMN "itemType" "EstimateItemType" NOT NULL DEFAULT 'WORK';

-- Добавление самосвязи для привязки материала к родительской работе
ALTER TABLE "estimate_import_items"
  ADD COLUMN "parentItemId" TEXT;

ALTER TABLE "estimate_import_items"
  ADD CONSTRAINT "estimate_import_items_parentItemId_fkey"
  FOREIGN KEY ("parentItemId")
  REFERENCES "estimate_import_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Индекс для быстрого поиска дочерних позиций
CREATE INDEX "estimate_import_items_parentItemId_idx"
  ON "estimate_import_items"("parentItemId");
