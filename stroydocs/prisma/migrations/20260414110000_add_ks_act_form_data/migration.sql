-- Migration: add_ks_act_form_data
-- Добавляет таблицу ks_act_form_data — структурированные данные формы КС-11 / КС-14
-- Связана 1:1 с execution_docs

CREATE TABLE "ks_act_form_data" (
    "id"               TEXT NOT NULL,

    -- п.3 — Проектная организация
    "designOrg"        TEXT,
    "designOrgInn"     TEXT,

    -- п.7 — Краткая характеристика объекта
    "objectDesc"       TEXT,
    "totalArea"        DOUBLE PRECISION,
    "buildingVolume"   DOUBLE PRECISION,
    "floorCount"       INTEGER,
    "constructionClass" TEXT,

    -- п.9 — Сроки строительства
    "startDate"        TIMESTAMP(3),
    "endDate"          TIMESTAMP(3),

    -- п.11 — Отклонения от проекта
    "deviations"       TEXT,

    -- п.12 — Стоимость строительства
    "constructionCost" DOUBLE PRECISION,
    "actualCost"       DOUBLE PRECISION,

    -- п.14 — Перечень документов
    "documents"        TEXT,

    -- п.15 — Заключение комиссии
    "conclusion"       TEXT,

    -- Табличные разделы (JSON-массивы)
    "participants"      JSONB,
    "indicators"        JSONB,
    "workList"          JSONB,
    "commissionMembers" JSONB,

    -- Связь с ExecutionDoc
    "executionDocId"   TEXT NOT NULL,

    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ks_act_form_data_pkey" PRIMARY KEY ("id")
);

-- Уникальность: один KsActFormData на один ExecutionDoc
CREATE UNIQUE INDEX "ks_act_form_data_executionDocId_key"
    ON "ks_act_form_data"("executionDocId");

-- Внешний ключ
ALTER TABLE "ks_act_form_data"
    ADD CONSTRAINT "ks_act_form_data_executionDocId_fkey"
    FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
