-- Идемпотентное исправление: убеждаемся что колонка normativeRefs существует.
-- Миграция 20260323000000_add_normative_refs падала с P3018 (42701) на БД где
-- колонка была добавлена через db push. IF NOT EXISTS предотвращает эту ошибку.
ALTER TABLE "estimate_import_items" ADD COLUMN IF NOT EXISTS "normativeRefs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
