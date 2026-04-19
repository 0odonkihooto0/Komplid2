-- REF.8: Добавление FK-полей к справочникам Currency, ContractKind, BudgetType
-- Старые поля (currency, ContractType, FundingType) сохранены для обратной совместимости
-- TODO(REF.8 major release): удалить старые поля после полного перевода на FK
--
-- ВАЖНО: таблицы currencies и budget_types создаются в следующей миграции
-- 20260419020000_add_ref3_tables_and_fk. FK-constraints добавляются там же.
-- Здесь только добавляем колонки (IF NOT EXISTS для идемпотентности при
-- повторном прогоне через start.sh --applied).

-- WarehouseMovement: добавить FK-колонку без constraint
ALTER TABLE "warehouse_movements" ADD COLUMN IF NOT EXISTS "currencyId" TEXT;

-- Contract: добавить FK-колонку + индекс без constraint
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "contractKindId" TEXT;
CREATE INDEX IF NOT EXISTS "contracts_contractKindId_idx" ON "contracts"("contractKindId");

-- FundingSource: добавить FK-колонку без constraint
ALTER TABLE "funding_sources" ADD COLUMN IF NOT EXISTS "budgetTypeId" TEXT;
