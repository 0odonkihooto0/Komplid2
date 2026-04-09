import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { updateEstimateItemSchema } from '@/lib/validations/estimate';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** PATCH — редактирование позиции импорта (при предпросмотре) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; importId: string; itemId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем что импорт в статусе PREVIEW
    const estimateImport = await db.estimateImport.findFirst({
      where: {
        id: params.importId,
        contractId: params.contractId,
        status: 'PREVIEW',
      },
    });
    if (!estimateImport) {
      return errorResponse('Импорт не найден или недоступен для редактирования', 404);
    }

    const body = await req.json();
    const parsed = updateEstimateItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Обновляем позицию
    const updateData: Record<string, unknown> = {};

    if (parsed.data.rawName !== undefined) updateData.rawName = parsed.data.rawName;
    if (parsed.data.rawUnit !== undefined) updateData.rawUnit = parsed.data.rawUnit;
    if (parsed.data.volume !== undefined) updateData.volume = parsed.data.volume;
    if (parsed.data.price !== undefined) updateData.price = parsed.data.price;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.normativeRefs !== undefined) updateData.normativeRefs = parsed.data.normativeRefs;

    if (parsed.data.suggestedKsiNodeId !== undefined) {
      updateData.suggestedKsiNodeId = parsed.data.suggestedKsiNodeId;
      // Если привязали к КСИ — статус MAPPED, если убрали — UNMATCHED
      if (parsed.data.suggestedKsiNodeId && parsed.data.status === undefined) {
        updateData.status = 'MAPPED';
      } else if (!parsed.data.suggestedKsiNodeId && parsed.data.status === undefined) {
        updateData.status = 'UNMATCHED';
      }
    }

    // Пересчитываем total если обновились volume или price
    if (parsed.data.volume !== undefined || parsed.data.price !== undefined) {
      const currentItem = await db.estimateImportItem.findUnique({
        where: { id: params.itemId },
      });
      if (currentItem) {
        const volume = parsed.data.volume !== undefined ? parsed.data.volume : currentItem.volume;
        const price = parsed.data.price !== undefined ? parsed.data.price : currentItem.price;
        updateData.total = volume && price ? volume * price : null;
      }
    }

    const updatedItem = await db.estimateImportItem.update({
      where: { id: params.itemId },
      data: updateData,
      include: {
        suggestedKsiNode: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Пересчитываем itemsMapped в импорте
    const mappedCount = await db.estimateImportItem.count({
      where: {
        importId: params.importId,
        suggestedKsiNodeId: { not: null },
        status: { not: 'SKIPPED' },
      },
    });

    await db.estimateImport.update({
      where: { id: params.importId },
      data: { itemsMapped: mappedCount },
    });

    return successResponse(updatedItem);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка редактирования позиции импорта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
