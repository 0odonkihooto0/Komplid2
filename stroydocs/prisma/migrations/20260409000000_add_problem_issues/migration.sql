-- Проблемные вопросы по объекту строительства (ЦУС стр. 30)

-- CreateEnum
CREATE TYPE "ProblemIssueType" AS ENUM ('CORRECTION_PSD', 'LAND_LEGAL', 'PRODUCTION', 'ORG_LEGAL', 'CONTRACT_WORK', 'FINANCIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ProblemIssueStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "problem_issues" (
    "id" TEXT NOT NULL,
    "type" "ProblemIssueType" NOT NULL,
    "status" "ProblemIssueStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "responsible" TEXT,
    "deadline" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "problem_issues_projectId_idx" ON "problem_issues"("projectId");

-- CreateIndex
CREATE INDEX "problem_issues_projectId_status_idx" ON "problem_issues"("projectId", "status");

-- AddForeignKey
ALTER TABLE "problem_issues" ADD CONSTRAINT "problem_issues_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_issues" ADD CONSTRAINT "problem_issues_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
