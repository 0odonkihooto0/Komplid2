-- CreateTable: estimate_categories
-- Таблица категорий (папок) для группировки смет.
-- Модель присутствовала в schema.prisma, но миграция не была создана.

CREATE TABLE "estimate_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_categories_projectId_idx" ON "estimate_categories"("projectId");

-- CreateIndex
CREATE INDEX "estimate_categories_parentId_idx" ON "estimate_categories"("parentId");

-- AddForeignKey: самореференция для иерархии подкатегорий
ALTER TABLE "estimate_categories" ADD CONSTRAINT "estimate_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "estimate_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: привязка к объекту строительства (cascade delete)
ALTER TABLE "estimate_categories" ADD CONSTRAINT "estimate_categories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: добавить поле categoryId в estimate_versions
-- (поле присутствовало в schema.prisma, но не в миграции)
ALTER TABLE "estimate_versions" ADD COLUMN "categoryId" TEXT;

-- AddForeignKey: FK categoryId → estimate_categories
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "estimate_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
