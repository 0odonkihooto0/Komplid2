import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { recalculateVersion } from '@/lib/estimates/recalculate';

export const dynamic = 'force-dynamic';

type Params = {
  params: { projectId: string; contractId: string; versionId: string; itemId: string };
};

const patchItemSchema = z.object({
  name: z.string().min(1).max(1000).optional(),
  itemType: z.enum(['WORK', 'MATERIAL']).optional(),
  code: z.string().max(50).nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  volume: z.number().nonnegative().nullable().optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
  laborCost: z.number().nonnegative().nullable().optional(),
  materialCost: z.number().nonnegative().nullable().optional(),
  machineryCost: z.number().nonnegative().nullable().optional(),
  priceIndex: z.number().positive().optional(),
  overhead: z.number().nonnegative().nullable().optional(),
  profit: z.number().nonnegative().nullable().optional(),
  ksiNodeId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * PATCH — редактировать позицию сметы (inline редактирование).
 * Автоматически пересчитывает totalPrice = volume × unitPrice.
 * Устанавливает isEdited=true для отметки ручной правки.
 */
export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const item = await db.estimateItem.findFirst({
      where: {
        id: params.itemId,
        isDeleted: false,
        chapter: { versionId: params.versionId, version: { contractId: params.contractId } },
      },
      include: { chapter: { select: { version: { select: { isBaseline: true } } } } },
    });
    if (!item) return errorResponse('Позиция не найдена', 404);

    if (item.chapter.version.isBaseline) {
      return errorResponse('Нельзя изменять базовую версию (Baseline)', 400);
    }

    const body = await req.json();
    const parsed = patchItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    // Пересчитываем totalPrice если изменились volume или unitPrice
    const newVolume = data.volume !== undefined ? data.volume : item.volume;
    const newUnitPrice = data.unitPrice !== undefined ? data.unitPrice : item.unitPrice;
    const newTotalPrice =
      newVolume !== null && newUnitPrice !== null
        ? (newVolume ?? 0) * (newUnitPrice ?? 0)
        : null;

    const updated = await db.estimateItem.update({
      where: { id: params.itemId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.itemType !== undefined && { itemType: data.itemType }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.volume !== undefined && { volume: data.volume }),
        ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
        totalPrice: newTotalPrice,
        ...(data.laborCost !== undefined && { laborCost: data.laborCost }),
        ...(data.materialCost !== undefined && { materialCost: data.materialCost }),
        ...(data.machineryCost !== undefined && { machineryCost: data.machineryCost }),
        ...(data.priceIndex !== undefined && { priceIndex: data.priceIndex }),
        ...(data.overhead !== undefined && { overhead: data.overhead }),
        ...(data.profit !== undefined && { profit: data.profit }),
        ...(data.ksiNodeId !== undefined && { ksiNodeId: data.ksiNodeId }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        isEdited: true,
      },
    });

    // Пересчитываем агрегаты версии (non-blocking)
    recalculateVersion(params.versionId).catch((err) => {
      logger.error({ err }, 'Ошибка пересчёта после редактирования позиции');
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка редактирования позиции сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * DELETE — мягкое удаление позиции сметы (isDeleted=true).
 * Физически запись не удаляется — для сохранения истории изменений.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const item = await db.estimateItem.findFirst({
      where: {
        id: params.itemId,
        isDeleted: false,
        chapter: { versionId: params.versionId, version: { contractId: params.contractId } },
      },
      include: { chapter: { select: { version: { select: { isBaseline: true } } } } },
    });
    if (!item) return errorResponse('Позиция не найдена', 404);

    if (item.chapter.version.isBaseline) {
      return errorResponse('Нельзя изменять базовую версию (Baseline)', 400);
    }

    await db.estimateItem.update({
      where: { id: params.itemId },
      data: { isDeleted: true },
    });

    // Пересчитываем агрегаты версии (non-blocking)
    recalculateVersion(params.versionId).catch((err) => {
      logger.error({ err }, 'Ошибка пересчёта после удаления позиции');
    });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления позиции сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
