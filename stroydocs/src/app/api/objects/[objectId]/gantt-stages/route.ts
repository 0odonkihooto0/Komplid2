import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createStageSchema = z.object({
  name: z.string().min(1).max(200),
  order: z.number().int().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Получаем стадии с количеством привязанных версий ГПР
    const stages = await db.ganttStage.findMany({
      where: { projectId: params.objectId },
      include: { _count: { select: { versions: true } } },
      orderBy: { order: 'asc' },
    });

    return successResponse(stages);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения стадий ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    const body: unknown = await req.json();
    const parsed = createStageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { name, order } = parsed.data;

    // Если порядок не передан — ставим следующий по счёту
    let nextOrder = order;
    if (nextOrder === undefined) {
      const count = await db.ganttStage.count({
        where: { projectId: params.objectId },
      });
      nextOrder = count + 1;
    }

    const stage = await db.ganttStage.create({
      data: {
        name,
        order: nextOrder,
        projectId: params.objectId,
      },
    });

    return successResponse(stage);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания стадии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
