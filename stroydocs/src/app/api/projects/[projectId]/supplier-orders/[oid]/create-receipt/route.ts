import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема создания приходной накладной из заказа поставщику
const createReceiptSchema = z.object({
  warehouseId: z.string().uuid(),
  movementDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * POST /api/projects/[projectId]/supplier-orders/[oid]/create-receipt
 * Создаёт складское движение типа RECEIPT (приходная накладная)
 * на основании позиций заказа поставщику.
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

    // Получение заказа с позициями для формирования приходной накладной
    const order = await db.supplierOrder.findFirst({
      where: { id: params.oid, projectId: params.projectId },
      include: {
        items: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });
    if (!order) return errorResponse('Заказ не найден', 404);

    const body = await req.json() as unknown;
    const parsed = createReceiptSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { warehouseId, movementDate, notes } = parsed.data;

    // Создание складского движения с линиями на основе позиций заказа
    const movement = await db.warehouseMovement.create({
      data: {
        number: `RECEIPT-${Date.now()}`,
        movementType: 'RECEIPT',
        status: 'DRAFT',
        movementDate: movementDate ? new Date(movementDate) : new Date(),
        toWarehouseId: warehouseId,
        orderId: order.id,
        projectId: params.projectId,
        createdById: session.user.id,
        ...(notes ? { notes } : {}),
        // Формируем строки движения из позиций заказа
        lines: {
          createMany: {
            data: order.items.map((item) => ({
              nomenclatureId: item.nomenclatureId ?? undefined,
              quantity: item.quantity,
              unit: item.unit ?? undefined,
              unitPrice: item.unitPrice ?? undefined,
              totalPrice: item.totalPrice ?? undefined,
            })),
          },
        },
      },
      include: {
        lines: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });

    return successResponse(movement);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания приходной накладной из заказа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
