-- Migration: expand_supplier_order
-- Расширение SupplierOrderItem: скидка, НДС, вес, объём, основание
-- Расширение SupplierOrder: маршрут согласования

-- Добавляем поля к позициям заказа
ALTER TABLE "supplier_order_items"
  ADD COLUMN "discount"   DOUBLE PRECISION,
  ADD COLUMN "vatRate"    DOUBLE PRECISION,
  ADD COLUMN "vatAmount"  DOUBLE PRECISION,
  ADD COLUMN "weight"     DOUBLE PRECISION,
  ADD COLUMN "volume"     DOUBLE PRECISION,
  ADD COLUMN "basis"      TEXT;

-- Добавляем ссылку на маршрут согласования к заказу
ALTER TABLE "supplier_orders"
  ADD COLUMN "approvalRouteId" TEXT;

-- Уникальный индекс — один маршрут к одному заказу
CREATE UNIQUE INDEX "supplier_orders_approvalRouteId_key" ON "supplier_orders"("approvalRouteId");

-- Обычный индекс для быстрого поиска
CREATE INDEX "supplier_orders_approvalRouteId_idx" ON "supplier_orders"("approvalRouteId");

-- FK: supplier_orders.approvalRouteId → approval_routes.id
ALTER TABLE "supplier_orders"
  ADD CONSTRAINT "supplier_orders_approvalRouteId_fkey"
  FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
