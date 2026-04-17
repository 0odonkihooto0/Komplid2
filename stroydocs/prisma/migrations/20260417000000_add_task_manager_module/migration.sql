-- =============================================================================
-- Модуль 18 — Планировщик задач (Task Manager). ЦУС стр. 351–365.
-- TASK.1 — расширение существующей модели Task и добавление новых сущностей:
--   TaskRole, TaskGroup, TaskLabel, TaskLabelOnTask, TaskType, TaskTemplate,
--   TaskSchedule, TaskChecklistItem, TaskReport.
-- Существующие данные Task/УП не затрагиваются — все новые поля опциональные.
-- =============================================================================

-- 1) Расширение enum TaskStatus
-- PostgreSQL ADD VALUE работает вне транзакции. Новые значения не используются
-- в этом же migration.sql (нет DEFAULT на них), поэтому безопасно.
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'PLANNED';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'REVISION';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'IRRELEVANT';

-- 2) Новые enum-ы
CREATE TYPE "TaskRoleType" AS ENUM ('AUTHOR', 'EXECUTOR', 'CONTROLLER', 'OBSERVER');
CREATE TYPE "TaskGroupVisibility" AS ENUM ('EVERYONE', 'SELECTED');
CREATE TYPE "TaskScheduleRepeat" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- 3) Расширение таблицы tasks новыми опциональными полями
ALTER TABLE "tasks" ADD COLUMN "typeId" TEXT,
                    ADD COLUMN "groupId" TEXT,
                    ADD COLUMN "templateId" TEXT,
                    ADD COLUMN "plannedStartDate" TIMESTAMP(3),
                    ADD COLUMN "actualStartDate" TIMESTAMP(3),
                    ADD COLUMN "completedAt" TIMESTAMP(3),
                    ADD COLUMN "duration" INTEGER,
                    ADD COLUMN "isReadByAuthor" BOOLEAN NOT NULL DEFAULT true,
                    ADD COLUMN "publicLinkToken" TEXT;

CREATE UNIQUE INDEX "tasks_publicLinkToken_key" ON "tasks"("publicLinkToken");
CREATE INDEX "tasks_typeId_idx" ON "tasks"("typeId");
CREATE INDEX "tasks_groupId_idx" ON "tasks"("groupId");
CREATE INDEX "tasks_templateId_idx" ON "tasks"("templateId");

-- 4) task_types — справочник типов (системные + пользовательские)
CREATE TABLE "task_types" (
  "id"             TEXT NOT NULL,
  "key"            TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "isSystem"       BOOLEAN NOT NULL DEFAULT false,
  "organizationId" TEXT,

  CONSTRAINT "task_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_types_key_key" ON "task_types"("key");
CREATE INDEX "task_types_organizationId_idx" ON "task_types"("organizationId");

ALTER TABLE "task_types"
  ADD CONSTRAINT "task_types_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) task_groups — иерархические группы задач
CREATE TABLE "task_groups" (
  "id"             TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "parentId"       TEXT,
  "visibility"     "TaskGroupVisibility" NOT NULL DEFAULT 'EVERYONE',
  "visibleUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "order"          INTEGER NOT NULL DEFAULT 0,
  "organizationId" TEXT NOT NULL,
  "authorId"       TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_groups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_groups_organizationId_idx" ON "task_groups"("organizationId");
CREATE INDEX "task_groups_parentId_idx" ON "task_groups"("parentId");

ALTER TABLE "task_groups"
  ADD CONSTRAINT "task_groups_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "task_groups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "task_groups"
  ADD CONSTRAINT "task_groups_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_groups"
  ADD CONSTRAINT "task_groups_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6) task_labels — метки для задач
CREATE TABLE "task_labels" (
  "id"             TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "color"          TEXT NOT NULL DEFAULT '#6366f1',
  "groupId"        TEXT,
  "organizationId" TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_labels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_labels_organizationId_idx" ON "task_labels"("organizationId");

ALTER TABLE "task_labels"
  ADD CONSTRAINT "task_labels_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "task_groups"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_labels"
  ADD CONSTRAINT "task_labels_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 7) task_templates — шаблоны задач
CREATE TABLE "task_templates" (
  "id"               TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "description"      TEXT,
  "typeId"           TEXT,
  "groupId"          TEXT,
  "parentTemplateId" TEXT,
  "priority"         "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "duration"         INTEGER,
  "s3Keys"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "organizationId"   TEXT NOT NULL,
  "authorId"         TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_templates_organizationId_idx" ON "task_templates"("organizationId");
CREATE INDEX "task_templates_typeId_idx" ON "task_templates"("typeId");
CREATE INDEX "task_templates_groupId_idx" ON "task_templates"("groupId");

ALTER TABLE "task_templates"
  ADD CONSTRAINT "task_templates_typeId_fkey"
  FOREIGN KEY ("typeId") REFERENCES "task_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "task_templates"
  ADD CONSTRAINT "task_templates_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "task_groups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "task_templates"
  ADD CONSTRAINT "task_templates_parentTemplateId_fkey"
  FOREIGN KEY ("parentTemplateId") REFERENCES "task_templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "task_templates"
  ADD CONSTRAINT "task_templates_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_templates"
  ADD CONSTRAINT "task_templates_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8) task_schedules — расписания для BullMQ cron
CREATE TABLE "task_schedules" (
  "id"             TEXT NOT NULL,
  "templateId"     TEXT NOT NULL,
  "repeatType"     "TaskScheduleRepeat" NOT NULL,
  "interval"       INTEGER NOT NULL DEFAULT 1,
  "weekDays"       INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "monthDays"      INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "startDate"      TIMESTAMP(3) NOT NULL,
  "endDate"        TIMESTAMP(3),
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createSubTasks" BOOLEAN NOT NULL DEFAULT false,
  "lastRunAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_schedules_isActive_startDate_idx" ON "task_schedules"("isActive", "startDate");

ALTER TABLE "task_schedules"
  ADD CONSTRAINT "task_schedules_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "task_templates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 9) task_roles — роли участников задачи
CREATE TABLE "task_roles" (
  "id"        TEXT NOT NULL,
  "taskId"    TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "role"      "TaskRoleType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_roles_taskId_userId_role_key"
  ON "task_roles"("taskId", "userId", "role");
CREATE INDEX "task_roles_userId_role_idx" ON "task_roles"("userId", "role");

ALTER TABLE "task_roles"
  ADD CONSTRAINT "task_roles_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "tasks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_roles"
  ADD CONSTRAINT "task_roles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 10) task_label_on_task — M:N связь задачи и меток
CREATE TABLE "task_label_on_task" (
  "taskId"  TEXT NOT NULL,
  "labelId" TEXT NOT NULL,

  CONSTRAINT "task_label_on_task_pkey" PRIMARY KEY ("taskId", "labelId")
);

CREATE INDEX "task_label_on_task_labelId_idx" ON "task_label_on_task"("labelId");

ALTER TABLE "task_label_on_task"
  ADD CONSTRAINT "task_label_on_task_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "tasks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_label_on_task"
  ADD CONSTRAINT "task_label_on_task_labelId_fkey"
  FOREIGN KEY ("labelId") REFERENCES "task_labels"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 11) task_checklist_items — пункты чек-листа с файлами
CREATE TABLE "task_checklist_items" (
  "id"        TEXT NOT NULL,
  "taskId"    TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "done"      BOOLEAN NOT NULL DEFAULT false,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "s3Keys"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_checklist_items_taskId_idx" ON "task_checklist_items"("taskId");

ALTER TABLE "task_checklist_items"
  ADD CONSTRAINT "task_checklist_items_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "tasks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 12) task_reports — отчёты о выполнении
CREATE TABLE "task_reports" (
  "id"          TEXT NOT NULL,
  "taskId"      TEXT NOT NULL,
  "progress"    TEXT NOT NULL,
  "newDeadline" TIMESTAMP(3),
  "s3Keys"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "authorId"    TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_reports_taskId_idx" ON "task_reports"("taskId");

ALTER TABLE "task_reports"
  ADD CONSTRAINT "task_reports_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "tasks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_reports"
  ADD CONSTRAINT "task_reports_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 13) FK от tasks.typeId → task_types, tasks.groupId → task_groups
--     (template-связь не FK — Task.templateId свободная ссылка)
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_typeId_fkey"
  FOREIGN KEY ("typeId") REFERENCES "task_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "task_groups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 14) Системные типы задач (seed — идемпотентно)
INSERT INTO "task_types" ("id", "key", "name", "isSystem", "organizationId") VALUES
  (gen_random_uuid()::text, 'task',    'Задача',    true, NULL),
  (gen_random_uuid()::text, 'meeting', 'Встреча',   true, NULL),
  (gen_random_uuid()::text, 'fix',     'Доработки', true, NULL)
ON CONFLICT ("key") DO NOTHING;
