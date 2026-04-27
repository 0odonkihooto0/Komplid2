-- Rescue: building_objects.memberPolicy + project_members
-- Оригинальная миграция 20260426010000 была помечена applied без выполнения SQL:
-- ALTER TABLE ADD COLUMN "ProjectMemberPolicy" не был обёрнут в DO$$, что давало
-- ошибку 42704 (undefined_object) при отсутствии enum → start.sh exit 1 →
-- bulk-mark помечал applied → колонка так и не добавлялась.
-- Все операции идемпотентны — безопасен при повторном запуске.

-- 1. Enum ProjectRole (если не был создан)
DO $$ BEGIN
  CREATE TYPE "ProjectRole" AS ENUM (
    'PROJECT_OWNER',
    'PROJECT_MANAGER',
    'SITE_FOREMAN',
    'SPECIALIST',
    'WORKER',
    'OBSERVER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Enum ProjectMemberPolicy (если не был создан)
DO $$ BEGIN
  CREATE TYPE "ProjectMemberPolicy" AS ENUM (
    'WORKSPACE_WIDE',
    'ASSIGNED_ONLY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Колонка memberPolicy в building_objects
-- Ловим ДВА исключения: колонка уже есть (duplicate_column)
-- ИЛИ enum не существует в этой БД по иным причинам (undefined_object).
DO $$ BEGIN
  ALTER TABLE "building_objects"
    ADD COLUMN "memberPolicy" "ProjectMemberPolicy" NOT NULL DEFAULT 'WORKSPACE_WIDE';
EXCEPTION
  WHEN duplicate_column THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- 4. Таблица project_members
CREATE TABLE IF NOT EXISTS "project_members" (
  "id"                TEXT NOT NULL,
  "projectId"         TEXT NOT NULL,
  "workspaceMemberId" TEXT NOT NULL,
  "projectRole"       "ProjectRole" NOT NULL,
  "assignedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedBy"        TEXT NOT NULL,
  "notes"             TEXT,

  CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- 5. FK: project_members.projectId → building_objects.id
DO $$ BEGIN
  ALTER TABLE "project_members"
    ADD CONSTRAINT "project_members_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. FK: project_members.workspaceMemberId → workspace_members.id
DO $$ BEGIN
  ALTER TABLE "project_members"
    ADD CONSTRAINT "project_members_workspaceMemberId_fkey"
    FOREIGN KEY ("workspaceMemberId") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Уникальный constraint: один член — одна роль в проекте
DO $$ BEGIN
  ALTER TABLE "project_members"
    ADD CONSTRAINT "project_members_projectId_workspaceMemberId_key"
    UNIQUE ("projectId", "workspaceMemberId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Индексы
CREATE INDEX IF NOT EXISTS "project_members_projectId_idx"
  ON "project_members"("projectId");

CREATE INDEX IF NOT EXISTS "project_members_workspaceMemberId_idx"
  ON "project_members"("workspaceMemberId");
