-- CreateEnum: JournalLinkType — тип связи между записями журналов (2026-04-14)
CREATE TYPE "JournalLinkType" AS ENUM ('OZR_TO_JVK', 'OZR_TO_AOSR', 'GENERIC');

-- CreateTable: JournalEntryLink — связи между записями журналов (Модуль 9)
CREATE TABLE "journal_entry_links" (
    "id" TEXT NOT NULL,
    "linkType" "JournalLinkType" NOT NULL DEFAULT 'GENERIC',
    "sourceEntryId" TEXT NOT NULL,
    "targetEntryId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_links_sourceEntryId_targetEntryId_key" ON "journal_entry_links"("sourceEntryId", "targetEntryId");
CREATE INDEX "journal_entry_links_sourceEntryId_idx" ON "journal_entry_links"("sourceEntryId");
CREATE INDEX "journal_entry_links_targetEntryId_idx" ON "journal_entry_links"("targetEntryId");

-- AddForeignKey
ALTER TABLE "journal_entry_links" ADD CONSTRAINT "journal_entry_links_sourceEntryId_fkey" FOREIGN KEY ("sourceEntryId") REFERENCES "special_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "journal_entry_links" ADD CONSTRAINT "journal_entry_links_targetEntryId_fkey" FOREIGN KEY ("targetEntryId") REFERENCES "special_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "journal_entry_links" ADD CONSTRAINT "journal_entry_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
