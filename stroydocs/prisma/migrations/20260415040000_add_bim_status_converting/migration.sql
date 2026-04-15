-- AlterEnum: добавить значение CONVERTING в BimModelStatus
-- Используется для состояния "парсинг завершён, идёт конвертация IFC → GLB".
-- ALTER TYPE ... ADD VALUE выполняется вне транзакции (Postgres ограничение).
ALTER TYPE "BimModelStatus" ADD VALUE IF NOT EXISTS 'CONVERTING';
