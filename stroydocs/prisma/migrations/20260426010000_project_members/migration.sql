-- Фаза C2: ProjectMember — роли на уровне проекта
-- Правило: ASSIGNED_ONLY ограничивает доступ до явно назначенных членов

-- 1. Enum ProjectRole
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

-- 2. Enum ProjectMemberPolicy
DO $$ BEGIN
  CREATE TYPE "ProjectMemberPolicy" AS ENUM (
    'WORKSPACE_WIDE',
    'ASSIGNED_ONLY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Поле memberPolicy в building_objects
ALTER TABLE "building_objects"
  ADD COLUMN IF NOT EXISTS "memberPolicy" "ProjectMemberPolicy" NOT NULL DEFAULT 'WORKSPACE_WIDE';

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

-- 7. Уникальность: один член — одна роль в проекте
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
