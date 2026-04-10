-- Добавляем новые значения в enum ProblemIssueType
ALTER TYPE "ProblemIssueType" ADD VALUE IF NOT EXISTS 'MATERIAL_SUPPLY';
ALTER TYPE "ProblemIssueType" ADD VALUE IF NOT EXISTS 'WORK_QUALITY';
ALTER TYPE "ProblemIssueType" ADD VALUE IF NOT EXISTS 'DEADLINES';

-- Расширяем таблицу problem_issues новыми полями
ALTER TABLE "problem_issues"
  ADD COLUMN IF NOT EXISTS "causes"          TEXT,
  ADD COLUMN IF NOT EXISTS "measuresTaken"   TEXT,
  ADD COLUMN IF NOT EXISTS "resolutionDate"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "assigneeOrgId"   TEXT,
  ADD COLUMN IF NOT EXISTS "verifierOrgId"   TEXT;

-- FK на organizations
ALTER TABLE "problem_issues"
  ADD CONSTRAINT "problem_issues_assigneeOrgId_fkey"
    FOREIGN KEY ("assigneeOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "problem_issues"
  ADD CONSTRAINT "problem_issues_verifierOrgId_fkey"
    FOREIGN KEY ("verifierOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Индексы
CREATE INDEX IF NOT EXISTS "problem_issues_assigneeOrgId_idx" ON "problem_issues"("assigneeOrgId");
CREATE INDEX IF NOT EXISTS "problem_issues_verifierOrgId_idx" ON "problem_issues"("verifierOrgId");

-- Таблица вложений к проблемным вопросам
CREATE TABLE IF NOT EXISTS "problem_issue_attachments" (
  "id"        TEXT NOT NULL,
  "fileName"  TEXT NOT NULL,
  "s3Key"     TEXT NOT NULL,
  "mimeType"  TEXT NOT NULL,
  "size"      INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issueId"   TEXT NOT NULL,

  CONSTRAINT "problem_issue_attachments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "problem_issue_attachments"
  ADD CONSTRAINT "problem_issue_attachments_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "problem_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "problem_issue_attachments_issueId_idx" ON "problem_issue_attachments"("issueId");
