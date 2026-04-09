import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; taskId: string } };

// POST — провести задание (DRAFT → IN_PROGRESS)
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const task = await db.designTask.findFirst({
      where: {
        id: params.taskId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, status: true },
    });
    if (!task) return errorResponse('Задание не найдено', 404);

    if (task.status !== 'DRAFT') {
      return errorResponse('Задание уже проведено или находится в другом статусе', 409);
    }

    const updated = await db.designTask.update({
      where: { id: params.taskId },
      data: { status: 'IN_PROGRESS' },
      select: { id: true, number: true, status: true },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка проведения задания ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
