import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const addLineSchema = z.object({
  nomenclatureId: z.string().uuid().optional(),
  quantity: z.number().positive(),
  unit: z.string().max(50).optional(),
  unitPrice: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(
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

    // Проверка существования движения
    const movement = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      select: { id: true, status: true },
    });
    if (!movement) return errorResponse('Движение не найдено', 404);

    // Строки можно добавлять только в черновик
    if (movement.status !== 'DRAFT') {
      return errorResponse('Добавление строк разрешено только для черновых движений', 409);
    }

    const body = await req.json() as unknown;
    const parsed = addLineSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { nomenclatureId, quantity, unit, unitPrice, notes } = parsed.data;

    const line = await db.warehouseMovementLine.create({
      data: {
        movementId: params.mid,
        quantity,
        unit,
        unitPrice,
        totalPrice: unitPrice !== undefined ? quantity * unitPrice : undefined,
        notes,
        nomenclatureId,
      },
      include: {
        nomenclature: { select: { id: true, name: true, unit: true } },
      },
    });

    return successResponse(line);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления строки движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
