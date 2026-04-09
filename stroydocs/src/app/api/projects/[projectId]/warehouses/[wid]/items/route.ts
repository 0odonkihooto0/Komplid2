import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; wid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка принадлежности склада объекту
    const warehouse = await db.warehouse.findFirst({
      where: { id: params.wid, projectId: params.projectId },
      select: { id: true },
    });
    if (!warehouse) return errorResponse('Склад не найден', 404);

    const page = Number(req.nextUrl.searchParams.get('page') ?? 1);
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 200);
    const skip = (page - 1) * limit;

    // Фильтр: только позиции с ненулевым остатком или резервом
    const where = {
      warehouseId: params.wid,
      OR: [
        { quantity: { gt: 0 } },
        { reservedQty: { gt: 0 } },
      ],
    };

    const [data, total] = await db.$transaction([
      db.warehouseItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          nomenclature: {
            select: {
              id: true,
              name: true,
              unit: true,
              category: true,
              vendorCode: true,
            },
          },
        },
      }),
      db.warehouseItem.count({ where }),
    ]);

    return successResponse(data, { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения остатков склада');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
