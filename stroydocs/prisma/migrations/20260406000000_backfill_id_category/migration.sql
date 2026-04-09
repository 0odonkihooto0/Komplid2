-- Бэкфилл: классификация существующих ИД по ГОСТ Р 70108-2025
UPDATE "ExecutionDoc" SET "idCategory" = 'ACCOUNTING_JOURNAL' WHERE "type" = 'OZR' AND "idCategory" IS NULL;
UPDATE "ExecutionDoc" SET "idCategory" = 'INSPECTION_ACT' WHERE "type" IN ('AOSR', 'TECHNICAL_READINESS_ACT') AND "idCategory" IS NULL;
UPDATE "ExecutionDoc" SET "idCategory" = 'OTHER_ID' WHERE "idCategory" IS NULL;
