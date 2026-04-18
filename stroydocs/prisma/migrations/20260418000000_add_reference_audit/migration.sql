-- CreateEnum
CREATE TYPE "ReferenceAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "reference_audits" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "ReferenceAuditAction" NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reference_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reference_audits_entityType_entityId_idx" ON "reference_audits"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "reference_audits_organizationId_entityType_idx" ON "reference_audits"("organizationId", "entityType");

-- AddForeignKey
ALTER TABLE "reference_audits" ADD CONSTRAINT "reference_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_audits" ADD CONSTRAINT "reference_audits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
