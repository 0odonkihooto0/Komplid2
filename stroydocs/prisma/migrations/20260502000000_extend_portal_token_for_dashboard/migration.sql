-- CreateEnum
CREATE TYPE "PortalTokenScope" AS ENUM ('PROJECT_DASHBOARD', 'CONTRACTOR_PORTFOLIO', 'CUSTOMER_GUEST');

-- AlterTable: расширяем project_portal_tokens новыми полями
ALTER TABLE "project_portal_tokens"
  ADD COLUMN IF NOT EXISTS "scopeType"      "PortalTokenScope" NOT NULL DEFAULT 'PROJECT_DASHBOARD',
  ADD COLUMN IF NOT EXISTS "allowIndexing"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "viewCount"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastViewedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "customSettings" JSONB,
  ADD COLUMN IF NOT EXISTS "revokedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedReason"  TEXT,
  ADD COLUMN IF NOT EXISTS "revokedById"    TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "project_portal_tokens_scopeType_projectId_idx"
  ON "project_portal_tokens"("scopeType", "projectId");

-- AddForeignKey: связь revokedBy → users
DO $$ BEGIN
  ALTER TABLE "project_portal_tokens"
    ADD CONSTRAINT "project_portal_tokens_revokedById_fkey"
    FOREIGN KEY ("revokedById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: portal_views (аналитика просмотров)
CREATE TABLE IF NOT EXISTS "portal_views" (
  "id"          TEXT NOT NULL,
  "tokenId"     TEXT NOT NULL,
  "viewedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash"      TEXT NOT NULL,
  "userAgent"   TEXT,
  "referer"     TEXT,
  "countryCode" VARCHAR(2),

  CONSTRAINT "portal_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "portal_views_tokenId_viewedAt_idx"
  ON "portal_views"("tokenId", "viewedAt");

-- AddForeignKey: portal_views → project_portal_tokens
DO $$ BEGIN
  ALTER TABLE "portal_views"
    ADD CONSTRAINT "portal_views_tokenId_fkey"
    FOREIGN KEY ("tokenId") REFERENCES "project_portal_tokens"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: расширяем building_objects полями публичного дашборда
ALTER TABLE "building_objects"
  ADD COLUMN IF NOT EXISTS "publicDashboardEnabled"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "publicDashboardSettings" JSONB;
