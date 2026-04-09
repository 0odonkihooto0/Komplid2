import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема добавления позиции к заказу поставщику
const addItemSchema = z.object({
  nomenclatureId: z.string().uuid().optional(),
  quantity: z.number().positive().default(1),
  unit: z.string().max(50).optional(),
  unitPrice: z.number().nonnegative().optional(),
});

/**
 * POST /api/projects/[projectId]/supplier-orders/[oid]/items
 * Добавляет новую позицию к заказу поставщику.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; oid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка принадлежности заказа проекту
    const order = await db.supplierOrder.findFirst({
      where: { id: params.oid, projectId: params.projectId },
      select: { id: true },
    });
    if (!order) return errorResponse('Заказ не найден', 404);

    const body = await req.json() as unknown;
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { nomenclatureId, quantity, unit, unitPrice } = parsed.data;

    // Вычисление итоговой суммы позиции
    const totalPrice =
      unitPrice !== undefined ? quantity * unitPrice : undefined;

    const item = await db.supplierOrderItem.create({
      data: {
        orderId: params.oid,
        quantity,
        ...(nomenclatureId ? { nomenclatureId } : {}),
        ...(unit ? { unit } : {}),
        ...(unitPrice !== undefined ? { unitPrice } : {}),
        ...(totalPrice !== undefined ? { totalPrice } : {}),
      },
      include: {
        nomenclature: { select: { id: true, name: true, unit: true } },
      },
    });

    return successResponse(item);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления позиции к заказу поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
