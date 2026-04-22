-- Аварийная идемпотентная миграция: восстановление workspace-структур
--
-- Причина: max_attempts=55 в start.sh меньше общего числа миграций (94).
-- При БД, частично созданной через db push, цикл start.sh исчерпывал 55 попыток
-- на миграциях #1–55 и не доходил до #93 (add_workspace_missing_columns).
-- В итоге _prisma_migrations помечал #93 как applied без выполнения SQL.
-- Данная миграция (#95) гарантированно выполнится при следующем деплое.
--
-- Все операции идемпотентны: IF NOT EXISTS / DO $$ EXCEPTION WHEN duplicate_object

-- ── 1. Enum-типы Workspace ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'COMPANY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Таблица workspaces ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "workspaces" (
    "id"                   TEXT NOT NULL,
    "type"                 "WorkspaceType" NOT NULL,
    "name"                 TEXT NOT NULL,
    "slug"                 TEXT NOT NULL,
    "organizationId"       TEXT,
    "ownerId"              TEXT NOT NULL,
    "activeSubscriptionId" TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_key"               ON "workspaces"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_organizationId_key"     ON "workspaces"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_activeSubscriptionId_key" ON "workspaces"("activeSubscriptionId");

-- ── 3. Таблица workspace_members ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "workspace_members" (
    "id"          TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "role"        "WorkspaceRole" NOT NULL,
    "joinedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspaceId_userId_key"
    ON "workspace_members"("workspaceId", "userId");
CREATE INDEX IF NOT EXISTS "workspace_members_userId_idx"
    ON "workspace_members"("userId");

-- ── 4. Таблица workspace_credits ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "workspace_credits" (
    "id"          TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "balanceKop"  INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspace_credits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_credits_workspaceId_key"
    ON "workspace_credits"("workspaceId");

-- ── 5. Колонка building_objects.workspaceId — ОСНОВНОЕ ИСПРАВЛЕНИЕ ────────
ALTER TABLE "building_objects" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "building_objects_workspaceId_idx"
    ON "building_objects"("workspaceId");

-- ── 6. Колонки users ─────────────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activeWorkspaceId" TEXT;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "professionalRole" "ProfessionalRole";
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── 7. FK constraints (все идемпотентны) ─────────────────────────────────
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

DO $$ BEGIN
  ALTER TABLE "workspace_credits" ADD CONSTRAINT "workspace_credits_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
