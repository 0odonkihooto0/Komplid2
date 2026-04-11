-- Иерархия задач и версии УП (Модуль 4 — Планировщик проекта)
-- Migration: 20260411020000_add_planner_hierarchy

-- Добавляем поля иерархии в таблицу задач
ALTER TABLE "tasks" ADD COLUMN "parentTaskId" TEXT;
ALTER TABLE "tasks" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tasks" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tasks" ADD COLUMN "versionId" TEXT;

-- Создаём таблицу версий управляющего плана
CREATE TABLE "project_management_versions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_management_versions_pkey" PRIMARY KEY ("id")
);

-- Внешний ключ: задача → родительская задача (самоссылка)
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey"
    FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Внешний ключ: задача → версия УП
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "project_management_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Внешний ключ: версия УП → объект строительства
ALTER TABLE "project_management_versions" ADD CONSTRAINT "project_management_versions_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Индексы для производительности
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks"("parentTaskId");
CREATE INDEX "tasks_versionId_idx" ON "tasks"("versionId");
CREATE INDEX "project_management_versions_projectId_idx" ON "project_management_versions"("projectId");
