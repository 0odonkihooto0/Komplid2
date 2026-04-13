-- CreateTable: справочник статусов позиций заявки на уровне организации
CREATE TABLE "material_request_item_statuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "material_request_item_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_request_item_statuses_organizationId_idx" ON "material_request_item_statuses"("organizationId");

-- AddForeignKey
ALTER TABLE "material_request_item_statuses" ADD CONSTRAINT "material_request_item_statuses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: заменяем status String? на statusId FK
ALTER TABLE "material_request_items" DROP COLUMN IF EXISTS "status";
ALTER TABLE "material_request_items" ADD COLUMN "statusId" TEXT;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "material_request_item_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
