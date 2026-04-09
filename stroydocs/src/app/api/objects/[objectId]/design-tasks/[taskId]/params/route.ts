import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; taskId: string } };

// GET — список параметров задания (max 95 шт., пагинация не нужна)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const task = await db.designTask.findFirst({
      where: {
        id: params.taskId,
        projectId: params.objectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!task) return errorResponse('Задание не найдено', 404);

    const taskParams = await db.designTaskParam.findMany({
      where: { taskId: params.taskId },
      orderBy: { order: 'asc' },
    });

    return successResponse(taskParams);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения параметров задания ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
