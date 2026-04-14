-- CreateTable: IdDocCategory — иерархические категории ИД (Модуль 10, 2026-04-14)
CREATE TABLE "id_doc_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "projectId" TEXT,
    "organizationId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "id_doc_categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable: ExecutionDoc — добавить categoryId
ALTER TABLE "execution_docs" ADD COLUMN "categoryId" TEXT;

-- AlterTable: Ks2Act — добавить categoryId
ALTER TABLE "ks2_acts" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "id_doc_categories_projectId_idx" ON "id_doc_categories"("projectId");
CREATE INDEX "id_doc_categories_organizationId_idx" ON "id_doc_categories"("organizationId");
CREATE INDEX "id_doc_categories_parentId_idx" ON "id_doc_categories"("parentId");
CREATE INDEX "execution_docs_categoryId_idx" ON "execution_docs"("categoryId");
CREATE INDEX "ks2_acts_categoryId_idx" ON "ks2_acts"("categoryId");

-- AddForeignKey: IdDocCategory → IdDocCategory (self-ref)
ALTER TABLE "id_doc_categories" ADD CONSTRAINT "id_doc_categories_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "id_doc_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: IdDocCategory → BuildingObject
ALTER TABLE "id_doc_categories" ADD CONSTRAINT "id_doc_categories_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: IdDocCategory → Organization
ALTER TABLE "id_doc_categories" ADD CONSTRAINT "id_doc_categories_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ExecutionDoc → IdDocCategory
ALTER TABLE "execution_docs" ADD CONSTRAINT "execution_docs_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "id_doc_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Ks2Act → IdDocCategory
ALTER TABLE "ks2_acts" ADD CONSTRAINT "ks2_acts_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "id_doc_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
