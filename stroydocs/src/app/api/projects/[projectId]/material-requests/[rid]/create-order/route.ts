import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема создания заказа поставщику из заявки
const createOrderSchema = z.object({
  supplierOrgId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  deliveryDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; rid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Получаем заявку с позициями — нужна для создания заказа
    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      include: {
        items: true,
      },
    });
    if (!request) return errorResponse('Заявка не найдена', 404);

    if (request.items.length === 0) {
      return errorResponse('Нельзя создать заказ по пустой заявке', 400);
    }

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { supplierOrgId, warehouseId, deliveryDate, notes } = parsed.data;

    // Создаём заказ и его позиции в одной транзакции, затем переводим заявку в IN_PROGRESS
    const [order] = await db.$transaction([
      db.supplierOrder.create({
        data: {
          number: `ORDER-${Date.now()}`,
          status: 'DRAFT',
          projectId: params.projectId,
          createdById: session.user.id,
          requestId: params.rid,
          supplierOrgId,
          warehouseId,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          notes,
          // Создаём позиции заказа из позиций заявки
          items: {
            create: request.items.map((item) => ({
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              nomenclatureId: item.nomenclatureId,
            })),
          },
        },
        include: {
          items: {
            include: {
              nomenclature: true,
            },
          },
        },
      }),
      // Переводим заявку в статус "В работе"
      db.materialRequest.update({
        where: { id: params.rid },
        data: { status: 'IN_PROGRESS' },
      }),
    ]);

    return successResponse(order);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания заказа поставщику из заявки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
