-- Модуль 7 — ГПР (График производства работ): Шаг 1 — Prisma Schema

-- CreateTable: стадии реализации проекта
CREATE TABLE "gantt_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: суточные планы по задачам ГПР
CREATE TABLE "gantt_daily_plans" (
    "id" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "workers" INTEGER,
    "machinery" TEXT,
    "volume" DOUBLE PRECISION,
    "unit" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gantt_daily_plans_pkey" PRIMARY KEY ("id")
);

-- AlterTable: новые поля в GanttVersion
ALTER TABLE "gantt_versions"
    ADD COLUMN "stageId" TEXT,
    ADD COLUMN "isDirective" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "projectId" TEXT,
    ADD COLUMN "description" TEXT;

-- AlterTable: новые поля в GanttTask
ALTER TABLE "gantt_tasks"
    ADD COLUMN "directiveStart" TIMESTAMP(3),
    ADD COLUMN "directiveEnd" TIMESTAMP(3),
    ADD COLUMN "volume" DOUBLE PRECISION,
    ADD COLUMN "volumeUnit" TEXT,
    ADD COLUMN "amount" DOUBLE PRECISION,
    ADD COLUMN "isMilestone" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "calendarType" TEXT,
    ADD COLUMN "linkedExecutionDocsCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "estimateItemId" TEXT;

-- CreateIndex
CREATE INDEX "gantt_stages_projectId_idx" ON "gantt_stages"("projectId");

-- CreateIndex
CREATE INDEX "gantt_daily_plans_taskId_idx" ON "gantt_daily_plans"("taskId");

-- CreateIndex
CREATE INDEX "gantt_daily_plans_planDate_idx" ON "gantt_daily_plans"("planDate");

-- CreateIndex
CREATE INDEX "gantt_versions_projectId_idx" ON "gantt_versions"("projectId");

-- CreateIndex
CREATE INDEX "gantt_tasks_estimateItemId_idx" ON "gantt_tasks"("estimateItemId");

-- AddForeignKey
ALTER TABLE "gantt_stages" ADD CONSTRAINT "gantt_stages_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_daily_plans" ADD CONSTRAINT "gantt_daily_plans_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_daily_plans" ADD CONSTRAINT "gantt_daily_plans_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_stageId_fkey"
    FOREIGN KEY ("stageId") REFERENCES "gantt_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_estimateItemId_fkey"
    FOREIGN KEY ("estimateItemId") REFERENCES "estimate_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
