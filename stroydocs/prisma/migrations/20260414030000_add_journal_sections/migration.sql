-- CreateTable: JournalSection — разделы ОЖР (Приказ Ростехнадзора № 1026/пр) (2026-04-14)
CREATE TABLE "journal_sections" (
    "id" TEXT NOT NULL,
    "sectionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "journal_sections_journalId_sectionNumber_key" ON "journal_sections"("journalId", "sectionNumber");
CREATE INDEX "journal_sections_journalId_idx" ON "journal_sections"("journalId");

-- AddForeignKey
ALTER TABLE "journal_sections" ADD CONSTRAINT "journal_sections_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "special_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: SpecialJournalEntry — добавление sectionId
ALTER TABLE "special_journal_entries"
  ADD COLUMN IF NOT EXISTS "sectionId" TEXT;

-- AddForeignKey
ALTER TABLE "special_journal_entries" ADD CONSTRAINT "special_journal_entries_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "journal_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
