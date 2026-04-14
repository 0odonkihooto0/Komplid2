-- Migration: add_ks2_additional_costs_correction
-- Добавляет поля для вкладки ДЗ сметы в КС-2:
--   excludedAdditionalCostIds — массив идентификаторов исключённых допзатрат
--   correctionToKs2Id         — ссылка на исходный акт для корректировочного акта

-- Добавить поле excludedAdditionalCostIds (массив TEXT с дефолтом [])
ALTER TABLE "ks2_acts"
    ADD COLUMN IF NOT EXISTS "excludedAdditionalCostIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Добавить поле correctionToKs2Id (nullable FK на тот же ks2_acts)
ALTER TABLE "ks2_acts"
    ADD COLUMN IF NOT EXISTS "correctionToKs2Id" TEXT;

-- Добавить FK constraint (self-referential, без CASCADE)
ALTER TABLE "ks2_acts"
    ADD CONSTRAINT "ks2_acts_correctionToKs2Id_fkey"
    FOREIGN KEY ("correctionToKs2Id") REFERENCES "ks2_acts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Индекс для correctionToKs2Id
CREATE INDEX IF NOT EXISTS "ks2_acts_correctionToKs2Id_idx"
    ON "ks2_acts"("correctionToKs2Id");
