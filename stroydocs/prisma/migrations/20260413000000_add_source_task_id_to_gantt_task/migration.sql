-- AlterTable
ALTER TABLE "gantt_tasks" ADD COLUMN "sourceTaskId" TEXT;

-- CreateIndex
CREATE INDEX "gantt_tasks_sourceTaskId_idx" ON "gantt_tasks"("sourceTaskId");
