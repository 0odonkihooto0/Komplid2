-- Migration: add_saved_field_values
-- Добавляет:
--   1. factVolume к execution_docs (для проверки ограничений ГПР при проведении ИД)
--   2. saved_field_values — автодополнение часто вводимых значений полей АОСР

-- 1. Добавить factVolume к таблице execution_docs
ALTER TABLE "execution_docs" ADD COLUMN "factVolume" DOUBLE PRECISION;

-- 2. Создать таблицу saved_field_values
CREATE TABLE "saved_field_values" (
    "id"        TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_field_values_pkey" PRIMARY KEY ("id")
);

-- Уникальность: одно значение одного поля на объект
CREATE UNIQUE INDEX "saved_field_values_fieldName_value_projectId_key"
    ON "saved_field_values"("fieldName", "value", "projectId");

-- Индекс для быстрого поиска подсказок по имени поля и объекту
CREATE INDEX "saved_field_values_fieldName_projectId_idx"
    ON "saved_field_values"("fieldName", "projectId");

-- Внешние ключи
ALTER TABLE "saved_field_values"
    ADD CONSTRAINT "saved_field_values_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_field_values"
    ADD CONSTRAINT "saved_field_values_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
