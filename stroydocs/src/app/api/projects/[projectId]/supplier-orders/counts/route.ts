import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { SupplierOrderType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Счётчики документов по типу для левой панели «Закупки»
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Подсчёт документов по каждому типу
    const rows = await db.supplierOrder.groupBy({
      by: ['type'],
      where: { projectId: params.projectId },
      _count: { id: true },
      orderBy: { type: 'asc' },
    });

    // Формируем результат с нулями по умолчанию
    const counts: Record<SupplierOrderType, number> = {
      SUPPLIER_ORDER: 0,
      WAREHOUSE_REQUEST: 0,
      SUPPLIER_INQUIRY: 0,
    };
    for (const row of rows) {
      counts[row.type] = row._count.id;
    }

    return successResponse(counts);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения счётчиков заказов поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
