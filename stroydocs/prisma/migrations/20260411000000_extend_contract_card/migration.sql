-- AlterTable: расширение модели Contract
ALTER TABLE "contracts"
ADD COLUMN     "executionStatus" TEXT,
ADD COLUMN     "vatRate" DOUBLE PRECISION,
ADD COLUMN     "vatAmount" DOUBLE PRECISION,
ADD COLUMN     "plannedStartDate" TIMESTAMP(3),
ADD COLUMN     "plannedEndDate" TIMESTAMP(3),
ADD COLUMN     "factStartDate" TIMESTAMP(3),
ADD COLUMN     "factEndDate" TIMESTAMP(3),
ADD COLUMN     "parentContractId" TEXT;

-- AlterTable: расширение модели ContractCategory
ALTER TABLE "contract_categories"
ADD COLUMN     "includeInPaymentWidget" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "executionStage" TEXT;

-- AlterTable: расширение модели ContractPayment
ALTER TABLE "contract_payments"
ADD COLUMN     "limitYear" INTEGER,
ADD COLUMN     "limitAmount" DOUBLE PRECISION;

-- AlterTable: расширение модели ChangeOrder
ALTER TABLE "change_orders"
ADD COLUMN     "changeType" TEXT;

-- CreateTable: обязательства по договору
CREATE TABLE "contract_obligations" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: авансовые платежи
CREATE TABLE "contract_advances" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "budgetType" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ход исполнения
CREATE TABLE "contract_executions" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "completionPercent" DOUBLE PRECISION,
    "workersCount" INTEGER,
    "equipmentCount" INTEGER,
    "notes" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: гарантийные удержания
CREATE TABLE "contract_guarantees" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION,
    "retentionDate" TIMESTAMP(3),
    "releaseDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RETAINED',
    "description" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_guarantees_pkey" PRIMARY KEY ("id")
);

-- CreateTable: произвольные реквизиты (key-value)
CREATE TABLE "contract_detail_infos" (
    "id" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldValue" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_detail_infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: финансовые таблицы
CREATE TABLE "contract_financial_tables" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_financial_tables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: contracts.parentContractId
CREATE INDEX "contracts_parentContractId_idx" ON "contracts"("parentContractId");

-- CreateIndex: новые модели
CREATE INDEX "contract_obligations_contractId_idx" ON "contract_obligations"("contractId");
CREATE INDEX "contract_advances_contractId_idx" ON "contract_advances"("contractId");
CREATE INDEX "contract_executions_contractId_idx" ON "contract_executions"("contractId");
CREATE INDEX "contract_guarantees_contractId_idx" ON "contract_guarantees"("contractId");
CREATE INDEX "contract_detail_infos_contractId_idx" ON "contract_detail_infos"("contractId");
CREATE INDEX "contract_financial_tables_contractId_idx" ON "contract_financial_tables"("contractId");

-- AddForeignKey: contracts.parentContractId → contracts
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: contract_obligations
ALTER TABLE "contract_obligations" ADD CONSTRAINT "contract_obligations_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: contract_advances
ALTER TABLE "contract_advances" ADD CONSTRAINT "contract_advances_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: contract_executions
ALTER TABLE "contract_executions" ADD CONSTRAINT "contract_executions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: contract_guarantees
ALTER TABLE "contract_guarantees" ADD CONSTRAINT "contract_guarantees_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: contract_detail_infos
ALTER TABLE "contract_detail_infos" ADD CONSTRAINT "contract_detail_infos_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: contract_financial_tables
ALTER TABLE "contract_financial_tables" ADD CONSTRAINT "contract_financial_tables_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
