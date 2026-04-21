-- Phase 7 Прораб-Журнал: публичный шаринг SpecialJournal (Прораб → ПТО)

ALTER TABLE "special_journals" ADD COLUMN "publicShareToken" TEXT;
ALTER TABLE "special_journals" ADD COLUMN "publicShareExpiresAt" TIMESTAMP(3);
ALTER TABLE "special_journals" ADD COLUMN "publicShareViewCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "special_journals_publicShareToken_key" ON "special_journals"("publicShareToken");
CREATE INDEX "special_journals_publicShareToken_idx" ON "special_journals"("publicShareToken");
