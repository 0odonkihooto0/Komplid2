import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема частичного обновления движения (только черновик)
const updateMovementSchema = z.object({
  notes: z.string().max(2000).optional(),
  movementDate: z.string().datetime().optional(),
  fromWarehouseId: z.string().uuid().optional().nullable(),
  toWarehouseId: z.string().uuid().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; mid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Получение движения с полными данными
    const movement = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      include: {
        lines: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true, vendorCode: true } },
            materialBatch: { select: { id: true, batchNumber: true } },
          },
          orderBy: { id: 'asc' },
        },
        fromWarehouse: { select: { id: true, name: true, location: true } },
        toWarehouse: { select: { id: true, name: true, location: true } },
        order: { select: { id: true, number: true, status: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { name: true } },
        currencyRef: { select: { id: true, name: true, shortName: true, shortSymbol: true, code: true } },
      },
    });

    if (!movement) return errorResponse('Движение не найдено', 404);

    return successResponse(movement);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения складского движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; mid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка существования и принадлежности движения
    const existing = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      select: { id: true, status: true },
    });
    if (!existing) return errorResponse('Движение не найдено', 404);

    // Редактирование разрешено только для черновиков
    if (existing.status !== 'DRAFT') {
      return errorResponse('Редактирование разрешено только для черновых движений', 409);
    }

    const body = await req.json() as unknown;
    const parsed = updateMovementSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { notes, movementDate, fromWarehouseId, toWarehouseId } = parsed.data;

    const updated = await db.warehouseMovement.update({
      where: { id: params.mid },
      data: {
        ...(notes !== undefined ? { notes } : {}),
        ...(movementDate !== undefined ? { movementDate: new Date(movementDate) } : {}),
        ...(fromWarehouseId !== undefined ? { fromWarehouseId } : {}),
        ...(toWarehouseId !== undefined ? { toWarehouseId } : {}),
      },
      include: {
        lines: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true } },
          },
        },
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления складского движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; mid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const existing = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      select: { id: true, status: true },
    });
    if (!existing) return errorResponse('Движение не найдено', 404);

    // Удаление разрешено только для черновиков
    if (existing.status !== 'DRAFT') {
      return errorResponse('Удаление разрешено только для черновых движений', 409);
    }

    await db.warehouseMovement.delete({ where: { id: params.mid } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления складского движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
