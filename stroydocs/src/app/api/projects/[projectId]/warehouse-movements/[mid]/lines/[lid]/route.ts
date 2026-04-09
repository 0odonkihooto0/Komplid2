import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateLineSchema = z.object({
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  nomenclatureId: z.string().uuid().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; mid: string; lid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка что движение — черновик
    const movement = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      select: { status: true },
    });
    if (!movement) return errorResponse('Движение не найдено', 404);
    if (movement.status !== 'DRAFT') {
      return errorResponse('Редактирование разрешено только для черновых движений', 409);
    }

    // Проверка существования строки
    const existing = await db.warehouseMovementLine.findFirst({
      where: { id: params.lid, movementId: params.mid },
      select: { id: true, quantity: true, unitPrice: true },
    });
    if (!existing) return errorResponse('Строка не найдена', 404);

    const body = await req.json() as unknown;
    const parsed = updateLineSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { quantity, unitPrice, notes, nomenclatureId } = parsed.data;

    // Пересчёт итога строки
    const newQty = quantity ?? existing.quantity;
    const newPrice = unitPrice !== undefined ? unitPrice : existing.unitPrice;
    const totalPrice = newPrice !== null && newPrice !== undefined ? newQty * newPrice : undefined;

    const updated = await db.warehouseMovementLine.update({
      where: { id: params.lid },
      data: {
        ...(quantity !== undefined ? { quantity } : {}),
        ...(unitPrice !== undefined ? { unitPrice } : {}),
        ...(totalPrice !== undefined ? { totalPrice } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(nomenclatureId !== undefined ? { nomenclatureId } : {}),
      },
      include: {
        nomenclature: { select: { id: true, name: true, unit: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления строки движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; mid: string; lid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const movement = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      select: { status: true },
    });
    if (!movement) return errorResponse('Движение не найдено', 404);
    if (movement.status !== 'DRAFT') {
      return errorResponse('Удаление строк разрешено только для черновых движений', 409);
    }

    const existing = await db.warehouseMovementLine.findFirst({
      where: { id: params.lid, movementId: params.mid },
      select: { id: true },
    });
    if (!existing) return errorResponse('Строка не найдена', 404);

    await db.warehouseMovementLine.delete({ where: { id: params.lid } });

    return successResponse({ id: params.lid });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления строки движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
