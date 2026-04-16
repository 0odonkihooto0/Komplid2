import { db, type PrismaTx } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Строка складского движения для создания партий.
 */
interface MovementLineForBatch {
  nomenclatureId: string | null;
  quantity: number;
  unit: string | null;
}

/**
 * Складское движение для создания партий материалов.
 */
interface MovementForBatch {
  id: string;
  number: string;
  lines: MovementLineForBatch[];
}

/**
 * Создаёт партии материалов (MaterialBatch) при поступлении на склад.
 *
 * Для каждой строки движения с заданной номенклатурой:
 * 1. Ищем Material по названию номенклатуры (связь косвенная — через name)
 * 2. Если Material найден — создаём партию с автономером
 * 3. Если Material не найден — пропускаем строку (best-effort логика)
 *
 * Функция работает в режиме «лучших усилий»: ошибки по отдельным строкам
 * логируются и не прерывают обработку остальных строк.
 */
export async function createBatchOnReceipt(
  tx: PrismaTx,
  movement: MovementForBatch,
): Promise<void> {
  for (const [index, line] of Array.from(movement.lines.entries())) {
    // Строки без номенклатуры пропускаем
    if (!line.nomenclatureId) {
      continue;
    }

    try {
      // Загружаем номенклатуру для получения названия
      const nomenclature = await tx.materialNomenclature.findUnique({
        where: { id: line.nomenclatureId },
        select: { name: true, vendorCode: true },
      });

      if (!nomenclature) {
        logger.warn(
          { nomenclatureId: line.nomenclatureId, movementId: movement.id },
          'Номенклатура не найдена при создании партии — строка пропущена',
        );
        continue;
      }

      // Ищем Material по имени номенклатуры (или артикулу если задан)
      // Связь между MaterialNomenclature и Material косвенная — через имя/артикул
      const material = await tx.material.findFirst({
        where: {
          OR: [
            { name: nomenclature.name },
            ...(nomenclature.vendorCode
              ? [{ invoiceNumber: nomenclature.vendorCode }]
              : []),
          ],
        },
        select: { id: true },
      });

      if (!material) {
        logger.warn(
          { nomenclatureName: nomenclature.name, movementId: movement.id },
          'Material не найден для номенклатуры при создании партии — строка пропущена',
        );
        continue;
      }

      // Формируем номер партии: номер движения + индекс строки
      const batchNumber = `${movement.number}-${index + 1}`;

      await tx.materialBatch.create({
        data: {
          batchNumber,
          quantity: line.quantity,
          arrivalDate: new Date(),
          materialId: material.id,
        },
      });

      logger.info(
        { batchNumber, materialId: material.id, movementId: movement.id },
        'Партия материала создана при поступлении',
      );
    } catch (err) {
      // Ошибка по одной строке не должна прерывать обработку остальных
      logger.warn(
        { err, lineIndex: index, movementId: movement.id },
        'Не удалось создать партию для строки движения — строка пропущена',
      );
    }
  }
}
