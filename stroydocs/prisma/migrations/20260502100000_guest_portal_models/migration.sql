-- ─────────────────────────────────────────────────────────────────
-- Модуль 17 Фаза 2 — Гостевой кабинет
-- ─────────────────────────────────────────────────────────────────

-- CreateEnum: статусы приглашения гостя
DO $$ BEGIN
  CREATE TYPE "GuestInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: тип целевого объекта комментария
DO $$ BEGIN
  CREATE TYPE "GuestCommentTarget" AS ENUM ('PHOTO', 'EXECUTION_DOC', 'DEFECT', 'ESTIMATE', 'STAGE', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: статус комментария гостя
DO $$ BEGIN
  CREATE TYPE "GuestCommentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: метод подписания гостем
DO $$ BEGIN
  CREATE TYPE "GuestSignatureMethod" AS ENUM ('SMS', 'EMAIL_CONFIRM', 'SIMPLE_ECP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: статус подписи гостя
DO $$ BEGIN
  CREATE TYPE "GuestSignatureStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: guest_invitations
CREATE TABLE IF NOT EXISTS "guest_invitations" (
  "id"          TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId"   TEXT,
  "contractId"  TEXT,
  "email"       TEXT,
  "phone"       TEXT,
  "fullName"    TEXT NOT NULL,
  "scope"       JSONB NOT NULL,
  "token"       TEXT NOT NULL,
  "status"      "GuestInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt"  TIMESTAMP(3),
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "createdById" TEXT NOT NULL,

  CONSTRAINT "guest_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guest_invitations_token_key" UNIQUE ("token")
);

CREATE INDEX IF NOT EXISTS "guest_invitations_workspaceId_status_idx"
  ON "guest_invitations"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "guest_invitations_token_idx"
  ON "guest_invitations"("token");
CREATE INDEX IF NOT EXISTS "guest_invitations_projectId_idx"
  ON "guest_invitations"("projectId");

DO $$ BEGIN
  ALTER TABLE "guest_invitations"
    ADD CONSTRAINT "guest_invitations_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_invitations"
    ADD CONSTRAINT "guest_invitations_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_invitations"
    ADD CONSTRAINT "guest_invitations_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "contracts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_invitations"
    ADD CONSTRAINT "guest_invitations_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: guest_comments
CREATE TABLE IF NOT EXISTS "guest_comments" (
  "id"           TEXT NOT NULL,
  "workspaceId"  TEXT NOT NULL,
  "projectId"    TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "targetType"   "GuestCommentTarget" NOT NULL,
  "targetId"     TEXT NOT NULL,
  "content"      TEXT NOT NULL,
  "status"       "GuestCommentStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedById" TEXT,
  "resolvedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "guest_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "guest_comments_projectId_status_idx"
  ON "guest_comments"("projectId", "status");
CREATE INDEX IF NOT EXISTS "guest_comments_targetType_targetId_idx"
  ON "guest_comments"("targetType", "targetId");

DO $$ BEGIN
  ALTER TABLE "guest_comments"
    ADD CONSTRAINT "guest_comments_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_comments"
    ADD CONSTRAINT "guest_comments_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_comments"
    ADD CONSTRAINT "guest_comments_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_comments"
    ADD CONSTRAINT "guest_comments_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: guest_signatures
CREATE TABLE IF NOT EXISTS "guest_signatures" (
  "id"                      TEXT NOT NULL,
  "workspaceId"             TEXT NOT NULL,
  "executionDocId"          TEXT NOT NULL,
  "signerUserId"            TEXT NOT NULL,
  "method"                  "GuestSignatureMethod" NOT NULL,
  "confirmationCode"        TEXT,
  "confirmationCodeHash"    TEXT,
  "confirmationExpiresAt"   TIMESTAMP(3),
  "confirmedAt"             TIMESTAMP(3),
  "ipAddress"               TEXT NOT NULL,
  "userAgent"               TEXT NOT NULL,
  "gpsLat"                  DOUBLE PRECISION,
  "gpsLng"                  DOUBLE PRECISION,
  "auditTrail"              JSONB NOT NULL,
  "status"                  "GuestSignatureStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "guest_signatures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "guest_signatures_executionDocId_idx"
  ON "guest_signatures"("executionDocId");
CREATE INDEX IF NOT EXISTS "guest_signatures_signerUserId_idx"
  ON "guest_signatures"("signerUserId");

DO $$ BEGIN
  ALTER TABLE "guest_signatures"
    ADD CONSTRAINT "guest_signatures_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_signatures"
    ADD CONSTRAINT "guest_signatures_executionDocId_fkey"
    FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_signatures"
    ADD CONSTRAINT "guest_signatures_signerUserId_fkey"
    FOREIGN KEY ("signerUserId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
