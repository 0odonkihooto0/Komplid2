-- Phase 6 ИД-Мастер: публичный шаринг ExecutionDoc + workType для шаблонов АОСР

ALTER TABLE "execution_docs" ADD COLUMN "publicShareToken" TEXT;
ALTER TABLE "execution_docs" ADD COLUMN "publicShareExpiresAt" TIMESTAMP(3);
ALTER TABLE "execution_docs" ADD COLUMN "publicShareViewCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "execution_docs_publicShareToken_key" ON "execution_docs"("publicShareToken");
CREATE INDEX "execution_docs_publicShareToken_idx" ON "execution_docs"("publicShareToken");

ALTER TABLE "document_templates" ADD COLUMN "workType" TEXT;
