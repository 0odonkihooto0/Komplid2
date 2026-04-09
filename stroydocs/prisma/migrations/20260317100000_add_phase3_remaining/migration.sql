-- Миграция Фазы 3: Workflow согласования, КС-2/КС-3, Реестр ИД

-- Перечисления
CREATE TYPE "ApprovalRouteStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESET');
CREATE TYPE "ApprovalStepStatus" AS ENUM ('WAITING', 'APPROVED', 'REJECTED');
CREATE TYPE "Ks2Status" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- Маршруты согласования
CREATE TABLE "approval_routes" (
    "id" TEXT NOT NULL,
    "status" "ApprovalRouteStatus" NOT NULL DEFAULT 'PENDING',
    "currentStepIdx" INTEGER NOT NULL DEFAULT 0,
    "executionDocId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_routes_pkey" PRIMARY KEY ("id")
);

-- Шаги согласования
CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'WAITING',
    "comment" TEXT,
    "userId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "routeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- Акты КС-2
CREATE TABLE "ks2_acts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "Ks2Status" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "s3Key" TEXT,
    "fileName" TEXT,
    "generatedAt" TIMESTAMP(3),
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ks2_acts_pkey" PRIMARY KEY ("id")
);

-- Позиции КС-2
CREATE TABLE "ks2_items" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ks2ActId" TEXT NOT NULL,
    "workItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ks2_items_pkey" PRIMARY KEY ("id")
);

-- Справки КС-3
CREATE TABLE "ks3_certificates" (
    "id" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "Ks2Status" NOT NULL DEFAULT 'DRAFT',
    "s3Key" TEXT,
    "fileName" TEXT,
    "generatedAt" TIMESTAMP(3),
    "contractId" TEXT NOT NULL,
    "ks2ActId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ks3_certificates_pkey" PRIMARY KEY ("id")
);

-- Реестры ИД
CREATE TABLE "id_registries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sheetCount" INTEGER NOT NULL DEFAULT 0,
    "s3Key" TEXT,
    "fileName" TEXT,
    "generatedAt" TIMESTAMP(3),
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "id_registries_pkey" PRIMARY KEY ("id")
);

-- Уникальные индексы
CREATE UNIQUE INDEX "approval_routes_executionDocId_key" ON "approval_routes"("executionDocId");
CREATE UNIQUE INDEX "ks3_certificates_ks2ActId_key" ON "ks3_certificates"("ks2ActId");

-- Индексы
CREATE INDEX "approval_steps_routeId_idx" ON "approval_steps"("routeId");
CREATE INDEX "approval_steps_userId_idx" ON "approval_steps"("userId");
CREATE INDEX "ks2_acts_contractId_idx" ON "ks2_acts"("contractId");
CREATE INDEX "ks2_acts_createdById_idx" ON "ks2_acts"("createdById");
CREATE INDEX "ks2_items_ks2ActId_idx" ON "ks2_items"("ks2ActId");
CREATE INDEX "ks2_items_workItemId_idx" ON "ks2_items"("workItemId");
CREATE INDEX "ks3_certificates_contractId_idx" ON "ks3_certificates"("contractId");
CREATE INDEX "id_registries_contractId_idx" ON "id_registries"("contractId");

-- Внешние ключи
ALTER TABLE "approval_routes" ADD CONSTRAINT "approval_routes_executionDocId_fkey"
    FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_routeId_fkey"
    FOREIGN KEY ("routeId") REFERENCES "approval_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ks2_acts" ADD CONSTRAINT "ks2_acts_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ks2_acts" ADD CONSTRAINT "ks2_acts_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ks2_items" ADD CONSTRAINT "ks2_items_ks2ActId_fkey"
    FOREIGN KEY ("ks2ActId") REFERENCES "ks2_acts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ks2_items" ADD CONSTRAINT "ks2_items_workItemId_fkey"
    FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ks3_certificates" ADD CONSTRAINT "ks3_certificates_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ks3_certificates" ADD CONSTRAINT "ks3_certificates_ks2ActId_fkey"
    FOREIGN KEY ("ks2ActId") REFERENCES "ks2_acts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "id_registries" ADD CONSTRAINT "id_registries_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
