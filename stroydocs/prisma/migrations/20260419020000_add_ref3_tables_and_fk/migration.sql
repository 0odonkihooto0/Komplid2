-- REF.3 + REF.8: Создание справочных таблиц currencies, budget_types,
-- measurement_units_ref, declension_cases и добавление FK-constraints.
--
-- Эти таблицы были добавлены в schema.prisma в рамках REF.3, но миграция не была
-- создана (таблицы существовали только через db push в dev-окружении).
-- Все операции — идемпотентны (IF NOT EXISTS / DO $$ ... EXCEPTION) для
-- корректной работы через start.sh при любом состоянии БД.

-- ─── Таблица currencies ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "currencies" (
    "id"             TEXT          NOT NULL,
    "name"           TEXT          NOT NULL,
    "shortName"      TEXT          NOT NULL,
    "shortSymbol"    TEXT          NOT NULL,
    "fullName"       TEXT,
    "englishName"    TEXT,
    "caseForm"       TEXT,
    "code"           TEXT          NOT NULL,
    "numericCode"    TEXT,
    "isSystem"       BOOLEAN       NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "currencies_code_key" ON "currencies"("code");
CREATE INDEX IF NOT EXISTS "currencies_organizationId_idx" ON "currencies"("organizationId");

DO $$ BEGIN
    ALTER TABLE "currencies" ADD CONSTRAINT "currencies_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Таблица budget_types ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "budget_types" (
    "id"             TEXT          NOT NULL,
    "name"           TEXT          NOT NULL,
    "code"           TEXT          NOT NULL,
    "color"          TEXT,
    "order"          INTEGER       NOT NULL DEFAULT 0,
    "isSystem"       BOOLEAN       NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "budget_types_code_key" ON "budget_types"("code");
CREATE INDEX IF NOT EXISTS "budget_types_organizationId_idx" ON "budget_types"("organizationId");

DO $$ BEGIN
    ALTER TABLE "budget_types" ADD CONSTRAINT "budget_types_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Таблица measurement_units_ref ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "measurement_units_ref" (
    "id"             TEXT          NOT NULL,
    "name"           TEXT          NOT NULL,
    "shortName"      TEXT          NOT NULL,
    "ruCode"         TEXT,
    "intCode"        TEXT,
    "category"       TEXT,
    "isSystem"       BOOLEAN       NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurement_units_ref_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "measurement_units_ref_organizationId_idx" ON "measurement_units_ref"("organizationId");

DO $$ BEGIN
    ALTER TABLE "measurement_units_ref" ADD CONSTRAINT "measurement_units_ref_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Таблица declension_cases ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "declension_cases" (
    "id"        TEXT     NOT NULL,
    "name"      TEXT     NOT NULL,
    "shortName" TEXT     NOT NULL,
    "order"     INTEGER  NOT NULL DEFAULT 0,
    "isSystem"  BOOLEAN  NOT NULL DEFAULT true,

    CONSTRAINT "declension_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "declension_cases_shortName_key" ON "declension_cases"("shortName");

-- ─── FK-колонки (на случай если 20260419010000 не выполнилась) ───────────────
ALTER TABLE "warehouse_movements" ADD COLUMN IF NOT EXISTS "currencyId" TEXT;
ALTER TABLE "contracts"           ADD COLUMN IF NOT EXISTS "contractKindId" TEXT;
CREATE INDEX IF NOT EXISTS "contracts_contractKindId_idx" ON "contracts"("contractKindId");
ALTER TABLE "funding_sources"     ADD COLUMN IF NOT EXISTS "budgetTypeId" TEXT;

-- ─── FK-constraints (идемпотентно через DO $$ ... EXCEPTION) ─────────────────
DO $$ BEGIN
    ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_currencyId_fkey"
        FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contractKindId_fkey"
        FOREIGN KEY ("contractKindId") REFERENCES "contract_kinds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "funding_sources" ADD CONSTRAINT "funding_sources_budgetTypeId_fkey"
        FOREIGN KEY ("budgetTypeId") REFERENCES "budget_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
