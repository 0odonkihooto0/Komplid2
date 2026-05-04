-- MODULE17 KF-1: AI-проверка комплектности ИД
-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AiCheckScope" AS ENUM ('FULL_PROJECT', 'CONTRACT', 'STAGE', 'DATE_RANGE', 'PRE_DELIVERY', 'CLOSURE_PACKAGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AiCheckStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IssueSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IssueCategory" AS ENUM ('MISSING_DOCUMENT', 'MISSING_SIGNATURE', 'WRONG_DATE', 'INCONSISTENCY', 'MISSING_FIELD', 'FORMAT_ERROR', 'REGULATORY', 'MISSING_CERTIFICATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: ai_compliance_checks
CREATE TABLE IF NOT EXISTS "ai_compliance_checks" (
    "id"               TEXT NOT NULL,
    "projectId"        TEXT NOT NULL,
    "initiatedById"    TEXT NOT NULL,
    "closurePackageId" TEXT,
    "scope"            "AiCheckScope" NOT NULL,
    "scopeFilter"      JSONB,
    "status"           "AiCheckStatus" NOT NULL DEFAULT 'QUEUED',
    "summary"          TEXT,
    "issueCount"       INTEGER NOT NULL DEFAULT 0,
    "checkedDocs"      INTEGER NOT NULL DEFAULT 0,
    "tokensUsed"       INTEGER NOT NULL DEFAULT 0,
    "cost"             DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt"        TIMESTAMP(3),
    "finishedAt"       TIMESTAMP(3),
    "errorMessage"     TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_compliance_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_compliance_issues
CREATE TABLE IF NOT EXISTS "ai_compliance_issues" (
    "id"                  TEXT NOT NULL,
    "checkId"             TEXT NOT NULL,
    "severity"            "IssueSeverity" NOT NULL,
    "category"            "IssueCategory" NOT NULL,
    "title"               TEXT NOT NULL,
    "description"         TEXT NOT NULL,
    "affectedDocIds"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "affectedJournalIds"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suggestedFix"        TEXT,
    "standard"            TEXT,
    "autoFixable"         BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt"          TIMESTAMP(3),
    "resolvedById"        TEXT,
    "resolutionNote"      TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_compliance_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_compliance_checks_projectId_status_idx"
    ON "ai_compliance_checks"("projectId", "status");

CREATE INDEX IF NOT EXISTS "ai_compliance_issues_checkId_severity_idx"
    ON "ai_compliance_issues"("checkId", "severity");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ai_compliance_checks"
    ADD CONSTRAINT "ai_compliance_checks_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_compliance_checks"
    ADD CONSTRAINT "ai_compliance_checks_initiatedById_fkey"
    FOREIGN KEY ("initiatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_compliance_checks"
    ADD CONSTRAINT "ai_compliance_checks_closurePackageId_fkey"
    FOREIGN KEY ("closurePackageId") REFERENCES "id_closure_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_compliance_issues"
    ADD CONSTRAINT "ai_compliance_issues_checkId_fkey"
    FOREIGN KEY ("checkId") REFERENCES "ai_compliance_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_compliance_issues"
    ADD CONSTRAINT "ai_compliance_issues_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
