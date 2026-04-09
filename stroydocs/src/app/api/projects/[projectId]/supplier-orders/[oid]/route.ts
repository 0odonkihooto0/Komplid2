import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { SupplierOrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Схема обновления заказа — все поля опциональны
const updateOrderSchema = z.object({
  status: z.nativeEnum(SupplierOrderStatus).optional(),
  deliveryDate: z.string().datetime().optional().nullable(),
  totalAmount: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  supplierOrgId: z.string().uuid().optional().nullable(),
  warehouseId: z.string().uuid().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
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

    // Получение заказа с позициями, номенклатурой и движениями склада
    const order = await db.supplierOrder.findFirst({
      where: { id: params.oid, projectId: params.projectId },
      include: {
        items: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true } },
          },
        },
        movements: {
          select: {
            id: true,
            number: true,
            movementType: true,
            status: true,
            movementDate: true,
          },
        },
        supplierOrg: { select: { id: true, name: true } },
        customerOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!order) return errorResponse('Заказ не найден', 404);

    return successResponse(order);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
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
    const existing = await db.supplierOrder.findFirst({
      where: { id: params.oid, projectId: params.projectId },
      select: { id: true },
    });
    if (!existing) return errorResponse('Заказ не найден', 404);

    const body = await req.json() as unknown;
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { status, deliveryDate, totalAmount, notes, supplierOrgId, warehouseId } =
      parsed.data;

    const updated = await db.supplierOrder.update({
      where: { id: params.oid },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(deliveryDate !== undefined
          ? { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }
          : {}),
        ...(totalAmount !== undefined ? { totalAmount } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(supplierOrgId !== undefined ? { supplierOrgId } : {}),
        ...(warehouseId !== undefined ? { warehouseId } : {}),
      },
      include: {
        items: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true } },
          },
        },
        supplierOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
