-- Миграция: add_general_docs (2026-04-14)
-- Расширение ExecutionDocType: новые типы документов ИД
-- Новые поля ExecutionDoc для GENERAL_DOCUMENT

-- AlterEnum: добавить 4 новых значения
ALTER TYPE "ExecutionDocType" ADD VALUE IF NOT EXISTS 'GENERAL_DOCUMENT';
ALTER TYPE "ExecutionDocType" ADD VALUE IF NOT EXISTS 'KS_6A';
ALTER TYPE "ExecutionDocType" ADD VALUE IF NOT EXISTS 'KS_11';
ALTER TYPE "ExecutionDocType" ADD VALUE IF NOT EXISTS 'KS_14';

-- AlterTable: новые поля для GENERAL_DOCUMENT
ALTER TABLE "execution_docs"
  ADD COLUMN IF NOT EXISTS "documentDate"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "note"             TEXT,
  ADD COLUMN IF NOT EXISTS "attachmentS3Keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
