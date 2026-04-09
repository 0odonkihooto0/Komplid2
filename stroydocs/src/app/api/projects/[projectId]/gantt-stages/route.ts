import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createStageSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  order: z.number().int().min(0).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const stages = await db.ganttStage.findMany({
      where: { projectId: params.projectId },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { versions: true } },
      },
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
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createStageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Определяем порядок: следующий после максимального
    const order =
      parsed.data.order ??
      ((await db.ganttStage.count({ where: { projectId: params.projectId } })));

    const stage = await db.ganttStage.create({
      data: {
        name: parsed.data.name,
        order,
        isCurrent: false,
        projectId: params.projectId,
      },
      include: {
        _count: { select: { versions: true } },
      },
    });

    return successResponse(stage);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания стадии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
