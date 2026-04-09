-- Миграция: расширение модели KsiNode для полноценного модуля КСИ
-- Добавляем поля description, tableCode, externalId, updatedAt
-- и индексы для ускорения фильтрации по классификационной таблице

-- Описание элемента из справочника КСИ
ALTER TABLE "ksi_nodes"
  ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Код классификационной таблицы (например «ОКС / CEn», «ФнС / FnS»)
ALTER TABLE "ksi_nodes"
  ADD COLUMN IF NOT EXISTS "tableCode" TEXT;

-- Идентификатор узла в системе Минстроя РФ (для синхронизации с внешним API)
ALTER TABLE "ksi_nodes"
  ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- Поле автообновления времени записи
ALTER TABLE "ksi_nodes"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Индекс для быстрой фильтрации по классификационной таблице
CREATE INDEX IF NOT EXISTS "ksi_nodes_tableCode_idx"
  ON "ksi_nodes"("tableCode");

-- Индекс для быстрой навигации по дереву (parentId)
CREATE INDEX IF NOT EXISTS "ksi_nodes_parentId_idx"
  ON "ksi_nodes"("parentId");
