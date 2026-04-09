import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateCommentSchema = z.object({
  // Ответ на замечание (исполнитель)
  response: z.string().min(1).optional(),
  // Действие: принять ответ (accept) или вернуть (reopen)
  action: z.enum(['accept', 'reopen']).optional(),
  // Прямое обновление полей
  deadline: z.string().datetime().nullable().optional(),
  s3Keys: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'ANSWERED', 'CLOSED']).optional(),
});

type Params = { params: { projectId: string; taskId: string; commentId: string } };

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

    const comment = await db.designTaskComment.findFirst({
      where: { id: params.commentId, taskId: params.taskId },
    });
    if (!comment) return errorResponse('Замечание не найдено', 404);

    const body = await req.json();
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { response, action, deadline, s3Keys, status } = parsed.data;

    // Определяем данные для обновления по типу операции
    let updateData: Record<string, unknown> = {};

    if (response) {
      // Исполнитель дает ответ на замечание
      updateData = {
        response,
        respondedAt: new Date(),
        respondedById: session.user.id,
        status: 'ANSWERED',
      };
    } else if (action === 'accept') {
      // Автор замечания принимает ответ → закрыть
      updateData = { status: 'CLOSED' };
    } else if (action === 'reopen') {
      // Вернуть замечание в работу
      updateData = {
        status: 'ACTIVE',
        response: null,
        respondedAt: null,
        respondedById: null,
      };
    } else {
      // Обычное обновление полей
      if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
      if (s3Keys !== undefined) updateData.s3Keys = s3Keys;
      if (status !== undefined) updateData.status = status;
    }

    const updated = await db.designTaskComment.update({
      where: { id: params.commentId },
      data: updateData,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        respondedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления замечания к заданию ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
