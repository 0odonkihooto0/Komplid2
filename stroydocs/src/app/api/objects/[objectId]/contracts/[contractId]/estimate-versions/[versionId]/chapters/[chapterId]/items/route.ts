import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { recalculateVersion } from '@/lib/estimates/recalculate';

export const dynamic = 'force-dynamic';

const createItemSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(1000),
  itemType: z.enum(['WORK', 'MATERIAL']).default('WORK'),
  code: z.string().max(50).optional(),
  unit: z.string().max(20).optional(),
  volume: z.number().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional(),
  laborCost: z.number().nonnegative().optional(),
  materialCost: z.number().nonnegative().optional(),
  machineryCost: z.number().nonnegative().optional(),
  priceIndex: z.number().positive().optional(),
  overhead: z.number().nonnegative().optional(),
  profit: z.number().nonnegative().optional(),
  ksiNodeId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/** POST — добавить позицию в главу сметы */
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string; chapterId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем что глава принадлежит версии договора
    const chapter = await db.estimateChapter.findFirst({
      where: { id: params.chapterId, versionId: params.versionId, version: { contractId: params.contractId } },
      include: { version: { select: { isBaseline: true } } },
    });
    if (!chapter) return errorResponse('Глава не найдена', 404);

    if (chapter.version.isBaseline) {
      return errorResponse('Нельзя изменять базовую версию (Baseline)', 400);
    }

    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    // Если sortOrder не передан — ставим в конец
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const lastItem = await db.estimateItem.findFirst({
        where: { chapterId: params.chapterId, isDeleted: false },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (lastItem?.sortOrder ?? -1) + 1;
    }

    // Вычисляем totalPrice
    const totalPrice =
      data.volume !== undefined && data.unitPrice !== undefined
        ? data.volume * data.unitPrice
        : undefined;

    const item = await db.estimateItem.create({
      data: {
        name: data.name,
        itemType: data.itemType,
        code: data.code ?? null,
        unit: data.unit ?? null,
        volume: data.volume ?? null,
        unitPrice: data.unitPrice ?? null,
        totalPrice: totalPrice ?? null,
        laborCost: data.laborCost ?? null,
        materialCost: data.materialCost ?? null,
        machineryCost: data.machineryCost ?? null,
        priceIndex: data.priceIndex ?? 1.0,
        overhead: data.overhead ?? null,
        profit: data.profit ?? null,
        ksiNodeId: data.ksiNodeId ?? null,
        sortOrder,
        chapterId: params.chapterId,
      },
    });

    // Пересчитываем итоги версии
    await recalculateVersion(params.versionId).catch((err) => {
      logger.error({ err }, 'Ошибка пересчёта после добавления позиции');
    });

    return successResponse(item);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания позиции сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
