import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; ks2Id: string } };

/** POST — автозаполнение позиций КС-2 из WorkItems и EstimateImportItems */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const act = await db.ks2Act.findFirst({
      where: { id: params.ks2Id, contractId: params.contractId },
    });
    if (!act) return errorResponse('Акт КС-2 не найден', 404);
    if (act.status !== 'DRAFT') return errorResponse('Заполнить автоматически можно только черновик', 400);

    // Получить подтверждённые позиции смет по договору
    const estimateItems = await db.estimateImportItem.findMany({
      where: {
        import: { contractId: params.contractId, status: 'CONFIRMED' },
        status: 'CONFIRMED',
        volume: { not: null },
        price: { not: null },
      },
      include: {
        workItem: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (estimateItems.length === 0) {
      return errorResponse('Нет подтверждённых позиций из смет. Сначала импортируйте смету.', 400);
    }

    // Удалить текущие позиции
    await db.ks2Item.deleteMany({ where: { ks2ActId: params.ks2Id } });

    // Создать позиции из сметных данных
    const items = estimateItems.map((item, idx) => ({
      ks2ActId: params.ks2Id,
      sortOrder: idx + 1,
      name: item.rawName,
      unit: item.rawUnit || 'шт',
      volume: item.volume ?? 0,
      unitPrice: item.price ?? 0,
      totalPrice: item.total ?? (item.volume ?? 0) * (item.price ?? 0),
      laborCost: 0,
      materialCost: 0,
      workItemId: item.workItemId ?? null,
    }));

    await db.ks2Item.createMany({ data: items });

    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
    await db.ks2Act.update({
      where: { id: params.ks2Id },
      data: { totalAmount },
    });

    const updatedAct = await db.ks2Act.findUnique({
      where: { id: params.ks2Id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return successResponse(updatedAct);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка автозаполнения КС-2');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
