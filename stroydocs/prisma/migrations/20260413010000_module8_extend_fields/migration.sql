-- AlterTable material_requests: add paymentDate, paymentAmount, type
ALTER TABLE "material_requests" ADD COLUMN "paymentDate" TIMESTAMP(3),
                                ADD COLUMN "paymentAmount" DOUBLE PRECISION,
                                ADD COLUMN "type" TEXT NOT NULL DEFAULT 'REQUEST';

-- AlterTable material_request_items: add purchaseUnit, deliveryDate, paymentDeadline, costArticle, purchasePrice, purchaseQty
ALTER TABLE "material_request_items" ADD COLUMN "purchaseUnit" TEXT,
                                     ADD COLUMN "deliveryDate" TIMESTAMP(3),
                                     ADD COLUMN "paymentDeadline" TIMESTAMP(3),
                                     ADD COLUMN "costArticle" TEXT,
                                     ADD COLUMN "purchasePrice" DOUBLE PRECISION,
                                     ADD COLUMN "purchaseQty" DOUBLE PRECISION;

-- AlterTable supplier_orders: add logistics and contract fields
ALTER TABLE "supplier_orders" ADD COLUMN "externalNumber" TEXT,
                              ADD COLUMN "expectedReadyDate" TIMESTAMP(3),
                              ADD COLUMN "expectedArrivalDate" TIMESTAMP(3),
                              ADD COLUMN "readinessCorrectionDate" TIMESTAMP(3),
                              ADD COLUMN "underdeliveryDate" TIMESTAMP(3),
                              ADD COLUMN "readinessThrough" TEXT,
                              ADD COLUMN "deliveryConditions" TEXT,
                              ADD COLUMN "contractType" TEXT,
                              ADD COLUMN "constructionObject" TEXT;

-- AlterEnum WarehouseMovementType: add RECEIPT_ORDER, EXPENSE_ORDER
ALTER TYPE "WarehouseMovementType" ADD VALUE 'RECEIPT_ORDER';
ALTER TYPE "WarehouseMovementType" ADD VALUE 'EXPENSE_ORDER';

-- AlterTable warehouse_movements: add consignor, consignee, vat, currency, externalNumber, attachmentS3Keys
ALTER TABLE "warehouse_movements" ADD COLUMN "consignor" TEXT,
                                  ADD COLUMN "consignee" TEXT,
                                  ADD COLUMN "vatType" TEXT,
                                  ADD COLUMN "vatRate" DOUBLE PRECISION,
                                  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'RUB',
                                  ADD COLUMN "externalNumber" TEXT,
                                  ADD COLUMN "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable warehouse_movement_lines: add vatAmount, totalWithVat, basis, gtd, country, comment
ALTER TABLE "warehouse_movement_lines" ADD COLUMN "vatAmount" DOUBLE PRECISION,
                                       ADD COLUMN "totalWithVat" DOUBLE PRECISION,
                                       ADD COLUMN "basis" TEXT,
                                       ADD COLUMN "gtd" TEXT,
                                       ADD COLUMN "country" TEXT,
                                       ADD COLUMN "comment" TEXT;
