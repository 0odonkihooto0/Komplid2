import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateParamSchema = z.object({
  value: z.string().nullable().optional(),
  hasComment: z.boolean().optional(),
});

type Params = { params: { projectId: string; taskId: string; paramId: string } };

// PATCH — обновить значение параметра задания ПИР
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const task = await db.designTask.findFirst({
      where: {
        id: params.taskId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!task) return errorResponse('Задание не найдено', 404);

    const param = await db.designTaskParam.findFirst({
      where: { id: params.paramId, taskId: params.taskId },
    });
    if (!param) return errorResponse('Параметр не найден', 404);

    const body = await req.json();
    const parsed = updateParamSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.designTaskParam.update({
      where: { id: params.paramId },
      data: parsed.data,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления параметра задания ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
