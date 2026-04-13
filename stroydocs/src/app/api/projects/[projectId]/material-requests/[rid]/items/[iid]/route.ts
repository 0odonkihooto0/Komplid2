import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема обновления позиции заявки
const updateItemSchema = z.object({
  quantity: z.number().positive('Количество должно быть положительным').optional(),
  unit: z.string().max(50).nullable().optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  statusId: z.string().uuid().nullable().optional(),
  quantityOrdered: z.number().nonnegative().optional(),
});

// Вспомогательная функция: проверить что позиция принадлежит заявке
async function findItem(iid: string, rid: string) {
  return db.materialRequestItem.findFirst({
    where: { id: iid, requestId: rid },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; rid: string; iid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка что заявка принадлежит проекту
    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      select: { id: true },
    });
    if (!request) return errorResponse('Заявка не найдена', 404);

    // Проверка что позиция принадлежит заявке
    const existing = await findItem(params.iid, params.rid);
    if (!existing) return errorResponse('Позиция заявки не найдена', 404);

    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.materialRequestItem.update({
      where: { id: params.iid },
      data: parsed.data,
      include: {
        nomenclature: true,
        material: true,
        itemStatus: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления позиции заявки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; rid: string; iid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка что заявка принадлежит проекту
    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      select: { id: true },
    });
    if (!request) return errorResponse('Заявка не найдена', 404);

    // Проверка что позиция принадлежит заявке
    const existing = await findItem(params.iid, params.rid);
    if (!existing) return errorResponse('Позиция заявки не найдена', 404);

    await db.materialRequestItem.delete({ where: { id: params.iid } });

    return successResponse({ id: params.iid });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления позиции заявки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
