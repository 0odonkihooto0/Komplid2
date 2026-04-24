-- Идемпотентная миграция: добавляет отсутствующие структуры Workspace-системы (Модуль 15)
-- Причина: модели Workspace/WorkspaceMember и поле BuildingObject.workspaceId были добавлены
-- в schema.prisma через db push без создания файла миграции.
-- Симптом на проде: P2022 "column building_objects.workspaceId does not exist"

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'COMPANY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Таблица workspaces (полная структура вкл. activeSubscriptionId, который 010000 добавляет через ALTER)
CREATE TABLE IF NOT EXISTS "workspaces" (
    "id" TEXT NOT NULL,
    "type" "WorkspaceType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "organizationId" TEXT,
    "ownerId" TEXT NOT NULL,
    "activeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_key" ON "workspaces"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_organizationId_key" ON "workspaces"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_activeSubscriptionId_key" ON "workspaces"("activeSubscriptionId");

-- 3. Таблица workspace_members
CREATE TABLE IF NOT EXISTS "workspace_members" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");
CREATE INDEX IF NOT EXISTS "workspace_members_userId_idx" ON "workspace_members"("userId");

-- 4. users.activeWorkspaceId (может уже существовать через db push)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activeWorkspaceId" TEXT;

-- 5. users.professionalRole (добавлен тем же модулем 15, enum ProfessionalRole создан в 010000)
-- ВАЖНО: если #010000 откатился (каскад из-за ALTER workspaces), тип ProfessionalRole
-- может отсутствовать — ловим и undefined_object, финальная рескью-миграция
-- #20260424000000 гарантированно его создаст и добавит колонку.
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "professionalRole" "ProfessionalRole";
EXCEPTION
  WHEN duplicate_column THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- 6. building_objects.workspaceId — ОСНОВНОЕ ИСПРАВЛЕНИЕ
ALTER TABLE "building_objects" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "building_objects_workspaceId_idx" ON "building_objects"("workspaceId");

-- 7. FK constraints (все идемпотентны)
DO $$ BEGIN
  ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "building_objects" ADD CONSTRAINT "building_objects_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
