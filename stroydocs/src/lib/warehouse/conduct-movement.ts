import { db, type PrismaTx } from '@/lib/db';
import { logger } from '@/lib/logger';
import { WarehouseMovementType, WarehouseMovStatus } from '@prisma/client';

/**
 * Обновляет (или создаёт) запись об остатке товара на складе.
 * delta > 0 — приход, delta < 0 — расход.
 */
export async function upsertWarehouseItem(
  tx: PrismaTx,
  warehouseId: string,
  nomenclatureId: string,
  delta: number,
): Promise<void> {
  // Ищем существующую запись остатка
  const existing = await tx.warehouseItem.findUnique({
    where: {
      warehouseId_nomenclatureId: { warehouseId, nomenclatureId },
    },
    select: { id: true, quantity: true },
  });

  if (existing) {
    const newQty = existing.quantity + delta;
    await tx.warehouseItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
    });
  } else {
    // Создаём запись остатка при первом движении
    await tx.warehouseItem.create({
      data: {
        warehouseId,
        nomenclatureId,
        quantity: delta,
      },
    });
  }
}

/**
 * Проводит складское движение: пересчитывает остатки по каждой строке
 * и меняет статус движения на CONDUCTED.
 *
 * Логика по типу движения:
 *   RECEIPT  — приход на склад-назначение (toWarehouseId)
 *   WRITEOFF — списание со склада-источника (fromWarehouseId)
 *   TRANSFER — расход из fromWarehouseId + приход в toWarehouseId
 *   SHIPMENT — расход из fromWarehouseId
 *   RETURN   — расход из fromWarehouseId (возврат поставщику)
 */
export async function conductMovement(movementId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    // Загружаем движение со строками
    const movement = await tx.warehouseMovement.findUnique({
      where: { id: movementId },
      include: { lines: true },
    });

    if (!movement) {
      throw new Error(`Складское движение ${movementId} не найдено`);
    }

    // Защита от повторного проведения
    if (movement.status === WarehouseMovStatus.CONDUCTED) {
      throw new Error(`Движение ${movement.number} уже проведено`);
    }

    if (movement.status === WarehouseMovStatus.CANCELLED) {
      throw new Error(`Движение ${movement.number} отменено — провести невозможно`);
    }

    // Обрабатываем каждую строку движения
    for (const line of movement.lines) {
      // Строки без номенклатуры пропускаем
      if (!line.nomenclatureId) {
        logger.warn({ lineId: line.id, movementId }, 'Строка движения без номенклатуры — пропущена');
        continue;
      }

      const { nomenclatureId, quantity } = line;

      switch (movement.movementType) {
        case WarehouseMovementType.RECEIPT: {
          // Поступление: приход в склад-назначение
          if (!movement.toWarehouseId) {
            throw new Error(`RECEIPT: не указан склад-назначение (toWarehouseId) в движении ${movement.number}`);
          }
          await upsertWarehouseItem(tx, movement.toWarehouseId, nomenclatureId, quantity);
          // Автоматически создаём партию материала в ЖВК
          await createBatchFromReceipt(tx, movement.projectId, nomenclatureId, quantity, movement.number, movement.movementDate);
          break;
        }

        case WarehouseMovementType.WRITEOFF: {
          // Списание в производство: расход из склада-источника
          if (!movement.fromWarehouseId) {
            throw new Error(`WRITEOFF: не указан склад-источник (fromWarehouseId) в движении ${movement.number}`);
          }
          await upsertWarehouseItem(tx, movement.fromWarehouseId, nomenclatureId, -quantity);
          break;
        }

        case WarehouseMovementType.TRANSFER: {
          // Перемещение: расход + приход
          if (!movement.fromWarehouseId || !movement.toWarehouseId) {
            throw new Error(`TRANSFER: не указаны оба склада в движении ${movement.number}`);
          }
          await upsertWarehouseItem(tx, movement.fromWarehouseId, nomenclatureId, -quantity);
          await upsertWarehouseItem(tx, movement.toWarehouseId, nomenclatureId, quantity);
          break;
        }

        case WarehouseMovementType.SHIPMENT:
        case WarehouseMovementType.RETURN: {
          // Отгрузка / Возврат поставщику: расход из склада-источника
          if (!movement.fromWarehouseId) {
            throw new Error(
              `${movement.movementType}: не указан склад-источник (fromWarehouseId) в движении ${movement.number}`,
            );
          }
          await upsertWarehouseItem(tx, movement.fromWarehouseId, nomenclatureId, -quantity);
          break;
        }

        case WarehouseMovementType.RECEIPT_ORDER: {
          // Приходный ордер: приход на склад-назначение (аналог RECEIPT)
          if (!movement.toWarehouseId) {
            throw new Error(`RECEIPT_ORDER: не указан склад-назначение (toWarehouseId) в движении ${movement.number}`);
          }
          await upsertWarehouseItem(tx, movement.toWarehouseId, nomenclatureId, quantity);
          await createBatchFromReceipt(tx, movement.projectId, nomenclatureId, quantity, movement.number, movement.movementDate);
          break;
        }

        case WarehouseMovementType.EXPENSE_ORDER: {
          // Расходный ордер: расход из склада-источника (аналог WRITEOFF)
          if (!movement.fromWarehouseId) {
            throw new Error(`EXPENSE_ORDER: не указан склад-источник (fromWarehouseId) в движении ${movement.number}`);
          }
          await upsertWarehouseItem(tx, movement.fromWarehouseId, nomenclatureId, -quantity);
          break;
        }

        default:
          // Защита на случай расширения enum
          logger.warn({ movementType: movement.movementType }, 'Неизвестный тип движения — строка пропущена');
      }
    }

    // Меняем статус движения на «Проведено»
    await tx.warehouseMovement.update({
      where: { id: movementId },
      data: { status: WarehouseMovStatus.CONDUCTED },
    });
  });
}

/**
 * Автоматически создаёт MaterialBatch (запись в ЖВК) при проведении RECEIPT-движения.
 * Ищет Material в рамках проекта по имени номенклатуры.
 * Если совпадение не найдено — пропускает (не бросает ошибку, чтобы не блокировать проведение).
 */
async function createBatchFromReceipt(
  tx: PrismaTx,
  projectId: string,
  nomenclatureId: string,
  quantity: number,
  movementNumber: string,
  movementDate: Date,
): Promise<void> {
  // Получаем номенклатуру
  const nomenclature = await tx.materialNomenclature.findUnique({
    where: { id: nomenclatureId },
    select: { name: true },
  });
  if (!nomenclature) return;

  // Ищем Material в рамках проекта по совпадению имени (через контракты)
  const material = await tx.material.findFirst({
    where: {
      name: { contains: nomenclature.name, mode: 'insensitive' },
      contract: { projectId },
    },
    select: { id: true },
  });
  if (!material) {
    logger.info({ nomenclatureId, projectId }, 'createBatchFromReceipt: связанный Material не найден — партия не создана');
    return;
  }

  await tx.materialBatch.create({
    data: {
      materialId: material.id,
      batchNumber: `ПСТ-${movementNumber}`,
      quantity,
      arrivalDate: movementDate,
    },
  });
}
