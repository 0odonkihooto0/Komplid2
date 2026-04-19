-- REF.8: Добавление FK-полей к справочникам Currency, ContractKind, BudgetType
-- Старые поля (currency, ContractType, FundingType) сохранены для обратной совместимости
-- TODO(REF.8 major release): удалить старые поля после полного перевода на FK

-- WarehouseMovement → Currency
ALTER TABLE "warehouse_movements" ADD COLUMN "currencyId" TEXT;
ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_currencyId_fkey"
  FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Contract → ContractKind
ALTER TABLE "contracts" ADD COLUMN "contractKindId" TEXT;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contractKindId_fkey"
  FOREIGN KEY ("contractKindId") REFERENCES "contract_kinds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "contracts_contractKindId_idx" ON "contracts"("contractKindId");

-- FundingSource → BudgetType
ALTER TABLE "funding_sources" ADD COLUMN "budgetTypeId" TEXT;
ALTER TABLE "funding_sources" ADD CONSTRAINT "funding_sources_budgetTypeId_fkey"
  FOREIGN KEY ("budgetTypeId") REFERENCES "budget_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
