-- Делаем ksiNodeId необязательным в work_items
-- Это позволяет создавать виды работ без привязки к классификатору КСИ

ALTER TABLE "work_items" ALTER COLUMN "ksiNodeId" DROP NOT NULL;
