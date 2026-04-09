-- Полнотекстовый поиск для таблицы rfis (Модуль 3, Шаг 9)
ALTER TABLE "rfis"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || number)
  ) STORED;
CREATE INDEX "idx_rfi_search" ON "rfis" USING GIN("search_vector");
