-- Migration: extend_movement_card
-- Расширение WarehouseMovement: дата прибытия
-- Расширение WarehouseMovementLine: скидка, ставка НДС по строке, адрес получателя

-- Добавляем поле к документу движения
ALTER TABLE "warehouse_movements"
  ADD COLUMN "arrivalDate" TIMESTAMP(3);

-- Добавляем поля к строкам движения
ALTER TABLE "warehouse_movement_lines"
  ADD COLUMN "discount"         DOUBLE PRECISION,
  ADD COLUMN "lineVatRate"      DOUBLE PRECISION,
  ADD COLUMN "recipientAddress" TEXT;
