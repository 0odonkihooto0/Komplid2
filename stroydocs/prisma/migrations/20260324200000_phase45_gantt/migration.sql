-- CreateEnum
CREATE TYPE "GanttDependencyType" AS ENUM ('FS', 'SS', 'FF', 'SF');

-- CreateEnum
CREATE TYPE "GanttTaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ON_HOLD');

-- CreateTable
CREATE TABLE "gantt_versions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gantt_tasks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "status" "GanttTaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "planStart" TIMESTAMP(3) NOT NULL,
    "planEnd" TIMESTAMP(3) NOT NULL,
    "factStart" TIMESTAMP(3),
    "factEnd" TIMESTAMP(3),
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "versionId" TEXT NOT NULL,
    "parentId" TEXT,
    "workItemId" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gantt_dependencies" (
    "id" TEXT NOT NULL,
    "type" "GanttDependencyType" NOT NULL DEFAULT 'FS',
    "lagDays" INTEGER NOT NULL DEFAULT 0,
    "predecessorId" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gantt_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gantt_versions_contractId_idx" ON "gantt_versions"("contractId");

-- CreateIndex
CREATE INDEX "gantt_versions_contractId_isActive_idx" ON "gantt_versions"("contractId", "isActive");

-- CreateIndex
CREATE INDEX "gantt_tasks_contractId_idx" ON "gantt_tasks"("contractId");

-- CreateIndex
CREATE INDEX "gantt_tasks_versionId_idx" ON "gantt_tasks"("versionId");

-- CreateIndex
CREATE INDEX "gantt_tasks_versionId_sortOrder_idx" ON "gantt_tasks"("versionId", "sortOrder");

-- CreateIndex
CREATE INDEX "gantt_tasks_parentId_idx" ON "gantt_tasks"("parentId");

-- CreateIndex
CREATE INDEX "gantt_tasks_workItemId_idx" ON "gantt_tasks"("workItemId");

-- CreateIndex
CREATE UNIQUE INDEX "gantt_dependencies_predecessorId_successorId_key" ON "gantt_dependencies"("predecessorId", "successorId");

-- CreateIndex
CREATE INDEX "gantt_dependencies_predecessorId_idx" ON "gantt_dependencies"("predecessorId");

-- CreateIndex
CREATE INDEX "gantt_dependencies_successorId_idx" ON "gantt_dependencies"("successorId");

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "gantt_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "gantt_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_dependencies" ADD CONSTRAINT "gantt_dependencies_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_dependencies" ADD CONSTRAINT "gantt_dependencies_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
