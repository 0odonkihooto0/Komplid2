import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема обновления позиции — все поля опциональны
const updateItemSchema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.string().max(50).optional().nullable(),
  unitPrice: z.number().nonnegative().optional().nullable(),
  discount: z.number().min(0).max(100).optional().nullable(),
  vatRate: z.number().min(0).max(100).optional().nullable(),
  vatAmount: z.number().nonnegative().optional().nullable(),
  weight: z.number().nonnegative().optional().nullable(),
  volume: z.number().nonnegative().optional().nullable(),
  basis: z.string().max(500).optional().nullable(),
});

/**
 * PATCH /api/projects/[projectId]/supplier-orders/[oid]/items/[iid]
 * Обновляет поля позиции заказа. Пересчитывает totalPrice.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; oid: string; iid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка принадлежности позиции заказу и проекту
    const existing = await db.supplierOrderItem.findFirst({
      where: {
        id: params.iid,
        orderId: params.oid,
        order: { projectId: params.projectId },
      },
      select: { id: true, quantity: true, unitPrice: true },
    });
    if (!existing) return errorResponse('Позиция не найдена', 404);

    const body = await req.json() as unknown;
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { quantity, unit, unitPrice, discount, vatRate, vatAmount, weight, volume, basis } = parsed.data;

    // Пересчёт итоговой суммы позиции при изменении количества или цены
    const newQty = quantity ?? existing.quantity;
    const newPrice = unitPrice !== undefined ? unitPrice : (existing.unitPrice as number | null);
    const totalPrice =
      newPrice !== null && newPrice !== undefined ? newQty * newPrice : undefined;

    const updated = await db.supplierOrderItem.update({
      where: { id: params.iid },
      data: {
        ...(quantity !== undefined ? { quantity } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(unitPrice !== undefined ? { unitPrice } : {}),
        ...(totalPrice !== undefined ? { totalPrice } : {}),
        ...(discount !== undefined ? { discount } : {}),
        ...(vatRate !== undefined ? { vatRate } : {}),
        ...(vatAmount !== undefined ? { vatAmount } : {}),
        ...(weight !== undefined ? { weight } : {}),
        ...(volume !== undefined ? { volume } : {}),
        ...(basis !== undefined ? { basis } : {}),
      },
      include: {
        nomenclature: { select: { id: true, name: true, unit: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления позиции заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * DELETE /api/projects/[projectId]/supplier-orders/[oid]/items/[iid]
 * Удаляет позицию из заказа поставщику.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; oid: string; iid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка принадлежности позиции заказу
    const existing = await db.supplierOrderItem.findFirst({
      where: {
        id: params.iid,
        orderId: params.oid,
        order: { projectId: params.projectId },
      },
      select: { id: true },
    });
    if (!existing) return errorResponse('Позиция не найдена', 404);

    await db.supplierOrderItem.delete({ where: { id: params.iid } });

    return successResponse({ id: params.iid });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления позиции заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
