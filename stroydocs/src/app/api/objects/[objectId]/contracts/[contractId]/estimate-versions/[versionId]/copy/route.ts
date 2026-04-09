import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const copySchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

/**
 * POST — создать глубокую копию версии сметы.
 * Новая версия получает тип CORRECTIVE и ссылку на оригинал (parentVersionId).
 * Копируются все главы и позиции (новые UUID, isEdited=false).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const original = await db.estimateVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            items: {
              where: { isDeleted: false },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!original) return errorResponse('Версия не найдена', 404);

    const body = await req.json().catch(() => ({}));
    const parsed = copySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    const copyName =
      data.name ?? `Копия: ${original.name} (${new Date().toLocaleDateString('ru-RU')})`;

    const newVersion = await db.$transaction(async (tx) => {
      // Создаём новую версию как корректировочную
      const version = await tx.estimateVersion.create({
        data: {
          name: copyName,
          versionType: 'CORRECTIVE',
          isBaseline: false,
          isActual: false,
          period: original.period,
          notes: original.notes,
          contractId: params.contractId,
          createdById: session.user.id,
          parentVersionId: original.id,
          totalAmount: original.totalAmount,
          totalLabor: original.totalLabor,
          totalMat: original.totalMat,
        },
      });

      // Копируем главы и позиции
      for (const chapter of original.chapters) {
        const newChapter = await tx.estimateChapter.create({
          data: {
            code: chapter.code,
            name: chapter.name,
            order: chapter.order,
            level: chapter.level,
            parentId: null, // Вложенность не копируем (достаточно для MVP)
            versionId: version.id,
            totalAmount: chapter.totalAmount,
            totalLabor: chapter.totalLabor,
            totalMat: chapter.totalMat,
          },
        });

        if (chapter.items.length > 0) {
          await tx.estimateItem.createMany({
            data: chapter.items.map((item) => ({
              sortOrder: item.sortOrder,
              itemType: item.itemType,
              code: item.code,
              name: item.name,
              unit: item.unit,
              volume: item.volume,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              laborCost: item.laborCost,
              materialCost: item.materialCost,
              machineryCost: item.machineryCost,
              priceIndex: item.priceIndex,
              overhead: item.overhead,
              profit: item.profit,
              ksiNodeId: item.ksiNodeId,
              workItemId: item.workItemId,
              importItemId: null, // Копия не привязана к оригинальному импорту
              chapterId: newChapter.id,
              isEdited: false,
              isDeleted: false,
            })),
          });
        }
      }

      return version;
    });

    logger.info(
      { originalId: params.versionId, newVersionId: newVersion.id },
      'Версия сметы скопирована'
    );

    return successResponse(newVersion);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка копирования версии сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
