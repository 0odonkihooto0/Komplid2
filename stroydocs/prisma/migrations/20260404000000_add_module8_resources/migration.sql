-- Модуль 8 — Ресурсы (Склад, Закупки, Логистика)
-- Идемпотентная миграция: безопасна при повторном выполнении

-- CreateEnum (идемпотентно)
DO $$ BEGIN
  CREATE TYPE "MaterialRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupplierOrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'DELIVERED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WarehouseMovementType" AS ENUM ('RECEIPT', 'SHIPMENT', 'TRANSFER', 'WRITEOFF', 'RETURN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WarehouseMovStatus" AS ENUM ('DRAFT', 'CONDUCTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable (идемпотентно)
CREATE TABLE IF NOT EXISTS "material_nomenclature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "category" TEXT,
    "vendorCode" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_nomenclature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "material_requests" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "MaterialRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "deliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "supplierOrgId" TEXT,
    "managerId" TEXT,
    "responsibleId" TEXT,
    "approvedById" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "material_request_items" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "quantityOrdered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "status" TEXT,
    "nomenclatureId" TEXT,
    "materialId" TEXT,
    "ganttTaskId" TEXT,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "material_request_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "supplier_orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "SupplierOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "supplierOrgId" TEXT,
    "customerOrgId" TEXT,
    "warehouseId" TEXT,
    "requestId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "supplier_order_items" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "nomenclatureId" TEXT,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "supplier_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "warehouse_items" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "warehouseId" TEXT NOT NULL,
    "nomenclatureId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "warehouse_movements" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "movementType" "WarehouseMovementType" NOT NULL,
    "status" "WarehouseMovStatus" NOT NULL DEFAULT 'DRAFT',
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "fromWarehouseId" TEXT,
    "toWarehouseId" TEXT,
    "orderId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "warehouse_movement_lines" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "movementId" TEXT NOT NULL,
    "nomenclatureId" TEXT,
    "materialBatchId" TEXT,

    CONSTRAINT "warehouse_movement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (идемпотентно)
CREATE INDEX IF NOT EXISTS "material_nomenclature_organizationId_idx" ON "material_nomenclature"("organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "material_requests_approvalRouteId_key" ON "material_requests"("approvalRouteId");

CREATE INDEX IF NOT EXISTS "material_requests_projectId_idx" ON "material_requests"("projectId");

CREATE INDEX IF NOT EXISTS "material_request_items_requestId_idx" ON "material_request_items"("requestId");

CREATE INDEX IF NOT EXISTS "material_request_items_nomenclatureId_idx" ON "material_request_items"("nomenclatureId");

CREATE INDEX IF NOT EXISTS "supplier_orders_projectId_idx" ON "supplier_orders"("projectId");

CREATE INDEX IF NOT EXISTS "supplier_orders_requestId_idx" ON "supplier_orders"("requestId");

CREATE INDEX IF NOT EXISTS "supplier_order_items_orderId_idx" ON "supplier_order_items"("orderId");

CREATE INDEX IF NOT EXISTS "warehouses_projectId_idx" ON "warehouses"("projectId");

CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_items_warehouseId_nomenclatureId_key" ON "warehouse_items"("warehouseId", "nomenclatureId");

CREATE INDEX IF NOT EXISTS "warehouse_items_warehouseId_idx" ON "warehouse_items"("warehouseId");

CREATE INDEX IF NOT EXISTS "warehouse_movements_projectId_idx" ON "warehouse_movements"("projectId");

CREATE INDEX IF NOT EXISTS "warehouse_movements_movementType_idx" ON "warehouse_movements"("movementType");

CREATE INDEX IF NOT EXISTS "warehouse_movement_lines_movementId_idx" ON "warehouse_movement_lines"("movementId");

-- AddForeignKey (идемпотентно)
DO $$ BEGIN
  ALTER TABLE "material_nomenclature" ADD CONSTRAINT "material_nomenclature_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "material_nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_ganttTaskId_fkey" FOREIGN KEY ("ganttTaskId") REFERENCES "gantt_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "material_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_customerOrgId_fkey" FOREIGN KEY ("customerOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "material_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "material_nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "supplier_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouse_items" ADD CONSTRAINT "warehouse_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouse_items" ADD CONSTRAINT "warehouse_items_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "material_nomenclature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "supplier_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouse_movement_lines" ADD CONSTRAINT "warehouse_movement_lines_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "warehouse_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouse_movement_lines" ADD CONSTRAINT "warehouse_movement_lines_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "material_nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "warehouse_movement_lines" ADD CONSTRAINT "warehouse_movement_lines_materialBatchId_fkey" FOREIGN KEY ("materialBatchId") REFERENCES "material_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
