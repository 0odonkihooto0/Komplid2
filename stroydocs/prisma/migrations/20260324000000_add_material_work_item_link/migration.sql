-- AlterTable
ALTER TABLE "materials" ADD COLUMN "workItemId" TEXT;

-- CreateIndex
CREATE INDEX "materials_workItemId_idx" ON "materials"("workItemId");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
