-- AlterTable: SpecialJournalEntry — добавить поле attachmentS3Keys (Модуль 9, 2026-04-14)
ALTER TABLE "special_journal_entries" ADD COLUMN "attachmentS3Keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
