import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема добавления позиции в заявку
const addItemSchema = z.object({
  quantity: z.number().positive('Количество должно быть положительным'),
  unit: z.string().max(50).optional(),
  nomenclatureId: z.string().uuid().optional(),
  materialId: z.string().uuid().optional(),
  ganttTaskId: z.string().uuid().optional(),
  unitPrice: z.number().nonnegative().optional(),
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

    // Проверка что заявка принадлежит проекту
    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      select: { id: true },
    });
    if (!request) return errorResponse('Заявка не найдена', 404);

    const body = await req.json();
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const item = await db.materialRequestItem.create({
      data: {
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
        nomenclatureId: parsed.data.nomenclatureId,
        materialId: parsed.data.materialId,
        ganttTaskId: parsed.data.ganttTaskId,
        unitPrice: parsed.data.unitPrice,
        notes: parsed.data.notes,
        requestId: params.rid,
      },
      include: {
        nomenclature: true,
        material: true,
      },
    });

    return successResponse(item);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления позиции в заявку');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
