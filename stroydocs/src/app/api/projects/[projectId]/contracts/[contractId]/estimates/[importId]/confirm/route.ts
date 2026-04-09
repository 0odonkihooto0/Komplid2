import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { MeasurementUnit } from '@prisma/client';
import { convertImportToVersion } from '@/lib/estimates/convert-import-to-version';

export const dynamic = 'force-dynamic';

const confirmEstimateSchema = z.object({
  selectedItemIds: z.array(z.string()).min(1, 'Выберите хотя бы одну позицию'),
  applyKsi: z.boolean().optional().default(false),
});

/** Маппинг строки единицы измерения в enum MeasurementUnit */
function mapRawUnitToEnum(unit: string | null): MeasurementUnit {
  if (!unit) return MeasurementUnit.PIECE;
  const u = unit.toLowerCase().trim();
  if (u.includes('м2') || u.includes('м²') || u === 'кв.м' || u === 'кв м') return MeasurementUnit.M2;
  if (u.includes('м3') || u.includes('м³') || u === 'куб.м' || u === 'куб м') return MeasurementUnit.M3;
  if (u === 'м' || u === 'пм' || u === 'п.м') return MeasurementUnit.M;
  if (u === 'т' || u === 'тонн' || u === 'тонна') return MeasurementUnit.TON;
  if (u === 'кг') return MeasurementUnit.KG;
  if (u === 'л') return MeasurementUnit.L;
  if (u === 'компл' || u === 'комплект' || u === 'к-т') return MeasurementUnit.SET;
  return MeasurementUnit.PIECE;
}

/** POST — подтверждение импорта: создание WorkItems и Materials из выбранных позиций */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; importId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const body = confirmEstimateSchema.safeParse(await req.json());
    if (!body.success) {
      return errorResponse(body.error.issues[0]?.message ?? 'Неверные данные', 400);
    }

    const { selectedItemIds, applyKsi } = body.data;

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const estimateImport = await db.estimateImport.findFirst({
      where: {
        id: params.importId,
        contractId: params.contractId,
        status: 'PREVIEW',
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!estimateImport) {
      return errorResponse('Импорт не найден или не в статусе предпросмотра', 404);
    }

    // Позиции работ, выбранные пользователем
    const selectedWorkItems = estimateImport.items.filter(
      (item) => selectedItemIds.includes(item.id) && item.itemType === 'WORK'
    );

    if (selectedWorkItems.length === 0) {
      return errorResponse('Ни одна из выбранных позиций не является работой', 400);
    }

    // Все материалы (дочерние элементы)
    const allMaterialItems = estimateImport.items.filter(
      (item) => item.itemType === 'MATERIAL' && item.parentItemId !== null
    );

    // Создаём WorkItems и Materials в транзакции
    const result = await db.$transaction(async (tx) => {
      const existingCount = await tx.workItem.count({
        where: { contractId: params.contractId },
      });

      const createdWorkItems = [];
      let itemIndex = 0;

      for (const item of selectedWorkItems) {
        itemIndex++;
        const cipher = `СМТ-${String(existingCount + itemIndex).padStart(3, '0')}`;

        const workItem = await tx.workItem.create({
          data: {
            projectCipher: cipher,
            name: item.rawName,
            unit: item.rawUnit ?? undefined,
            volume: item.volume ?? undefined,
            normatives: item.normativeRefs?.length ? item.normativeRefs.join(', ') : undefined,
            // КСИ привязывается только если пользователь включил соответствующую опцию
            ksiNodeId: applyKsi && item.suggestedKsiNodeId ? item.suggestedKsiNodeId : undefined,
            contractId: params.contractId,
          },
        });

        // Обновляем позицию: status = CONFIRMED, workItemId
        await tx.estimateImportItem.update({
          where: { id: item.id },
          data: {
            status: 'CONFIRMED',
            workItemId: workItem.id,
          },
        });

        // Создаём Material для каждого дочернего материала этой работы
        const childMaterials = allMaterialItems.filter((m) => m.parentItemId === item.id);
        for (const mat of childMaterials) {
          await tx.material.create({
            data: {
              name: mat.rawName,
              unit: mapRawUnitToEnum(mat.rawUnit),
              quantityReceived: mat.volume ?? 0,
              contractId: params.contractId,
              workItemId: workItem.id,
            },
          });

          // Помечаем материал как подтверждённый
          await tx.estimateImportItem.update({
            where: { id: mat.id },
            data: { status: 'CONFIRMED' },
          });
        }

        // Если у работы нет дочерних материалов — создаём материал из названия работы
        if (childMaterials.length === 0) {
          await tx.material.create({
            data: {
              name: item.rawName,
              unit: mapRawUnitToEnum(item.rawUnit),
              quantityReceived: item.volume ?? 0,
              contractId: params.contractId,
              workItemId: workItem.id,
            },
          });
        }

        createdWorkItems.push(workItem);
      }

      // Обновляем статус импорта
      await tx.estimateImport.update({
        where: { id: params.importId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      return createdWorkItems;
    });

    // Конвертируем импорт в версию сметы (отдельно от WorkItem транзакции).
    // При ошибке конвертации WorkItems уже созданы успешно — не откатываем запрос.
    try {
      await convertImportToVersion(params.importId, params.contractId, session.user.id);
    } catch (convErr) {
      logger.error({ err: convErr }, 'Ошибка конвертации импорта в EstimateVersion');
    }

    logger.info(
      {
        importId: params.importId,
        workItemsCreated: result.length,
        selectedCount: selectedItemIds.length,
        applyKsi,
      },
      'Импорт сметы подтверждён, WorkItems созданы'
    );

    return successResponse({
      confirmed: true,
      workItemsCreated: result.length,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка подтверждения импорта сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
