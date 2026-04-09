-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DefectCategory" AS ENUM ('CONSTRUCTION', 'MATERIALS', 'DOCUMENTATION', 'SAFETY', 'OTHER');

-- CreateTable
CREATE TABLE "defects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "DefectCategory" NOT NULL DEFAULT 'OTHER',
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "normativeRef" TEXT,
    "deadline" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "annotations" JSONB,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "authorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_comments" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "statusChange" "DefectStatus",
    "defectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "defects_projectId_idx" ON "defects"("projectId");

-- CreateIndex
CREATE INDEX "defects_projectId_status_idx" ON "defects"("projectId", "status");

-- CreateIndex
CREATE INDEX "defects_contractId_idx" ON "defects"("contractId");

-- CreateIndex
CREATE INDEX "defects_authorId_idx" ON "defects"("authorId");

-- CreateIndex
CREATE INDEX "defects_assigneeId_idx" ON "defects"("assigneeId");

-- CreateIndex
CREATE INDEX "defects_deadline_idx" ON "defects"("deadline");

-- CreateIndex
CREATE INDEX "defect_comments_defectId_idx" ON "defect_comments"("defectId");

-- CreateIndex
CREATE INDEX "defect_comments_authorId_idx" ON "defect_comments"("authorId");

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_comments" ADD CONSTRAINT "defect_comments_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_comments" ADD CONSTRAINT "defect_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
