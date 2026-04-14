-- AlterTable: SpecialJournal — добавление полей реквизитов журнала (2026-04-14)
ALTER TABLE "special_journals"
  ADD COLUMN IF NOT EXISTS "requisites" JSONB,
  ADD COLUMN IF NOT EXISTS "startDate"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endDate"    TIMESTAMP(3);
