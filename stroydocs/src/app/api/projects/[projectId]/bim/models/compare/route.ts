import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { compareModels } from '@/lib/bim/compare-models';
import { logger } from '@/lib/logger';

const compareSchema = z.object({
  modelIdA: z.string().min(1, 'Укажите первую модель'),
  modelIdB: z.string().min(1, 'Укажите вторую модель'),
});

/** Максимальное количество элементов на модель для сравнения */
const MAX_ELEMENTS = 5000;

/**
 * POST /api/projects/[projectId]/bim/models/compare
 * Сравнивает элементы двух ТИМ-моделей по ifcGuid.
 * Обе модели должны принадлежать одному проекту и организации.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const body: unknown = await req.json();
    const parsed = compareSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { modelIdA, modelIdB } = parsed.data;

    if (modelIdA === modelIdB) {
      return errorResponse('Выберите две разные модели для сравнения', 400);
    }

    // Проверяем принадлежность обеих моделей проекту и организации
    const [modelA, modelB] = await Promise.all([
      db.bimModel.findFirst({
        where: {
          id: modelIdA,
          projectId: params.projectId,
          buildingObject: { organizationId: session.user.organizationId },
        },
        select: { id: true, name: true, elementCount: true },
      }),
      db.bimModel.findFirst({
        where: {
          id: modelIdB,
          projectId: params.projectId,
          buildingObject: { organizationId: session.user.organizationId },
        },
        select: { id: true, name: true, elementCount: true },
      }),
    ]);

    if (!modelA) return errorResponse('Модель A не найдена', 404);
    if (!modelB) return errorResponse('Модель B не найдена', 404);

    // Загружаем элементы обеих моделей из БД
    const [elementsA, elementsB] = await Promise.all([
      db.bimElement.findMany({
        where: { modelId: modelIdA },
        take: MAX_ELEMENTS,
        select: { id: true, ifcGuid: true, ifcType: true, name: true, layer: true, level: true },
        orderBy: { ifcGuid: 'asc' },
      }),
      db.bimElement.findMany({
        where: { modelId: modelIdB },
        take: MAX_ELEMENTS,
        select: { id: true, ifcGuid: true, ifcType: true, name: true, layer: true, level: true },
        orderBy: { ifcGuid: 'asc' },
      }),
    ]);

    const diff = compareModels(elementsA, elementsB);

    return successResponse({
      modelA: { id: modelA.id, name: modelA.name },
      modelB: { id: modelB.id, name: modelB.name },
      diff,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM models compare failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
