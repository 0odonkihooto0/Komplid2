-- Migration: add factVolume to gantt_tasks and actualAmount to funding_sources
-- All statements use IF NOT EXISTS to be idempotent (safe on fresh and existing DBs).

-- Фактический объём выполненных работ по задаче ГПР
ALTER TABLE "gantt_tasks" ADD COLUMN IF NOT EXISTS "factVolume" DOUBLE PRECISION;

-- Фактически освоенная сумма по источнику финансирования
ALTER TABLE "funding_sources" ADD COLUMN IF NOT EXISTS "actualAmount" DOUBLE PRECISION;
