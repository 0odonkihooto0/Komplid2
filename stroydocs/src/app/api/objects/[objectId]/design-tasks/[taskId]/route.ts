import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateDesignTaskSchema } from '@/lib/validations/design-task';

export const dynamic = 'force-dynamic';

// Полный include для карточки задания
const TASK_FULL_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  agreedBy: { select: { id: true, firstName: true, lastName: true } },
  customerOrg: { select: { id: true, name: true } },
  customerPerson: { select: { id: true, firstName: true, lastName: true } },
  parameters: { orderBy: { order: 'asc' as const } },
  comments: {
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
      assignee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { number: 'asc' as const },
  },
  _count: { select: { comments: true, parameters: true } },
  approvalRoute: {
    include: {
      steps: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { stepIndex: 'asc' as const },
      },
    },
  },
} as const;

type Params = { params: { objectId: string; taskId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const task = await db.designTask.findFirst({
      where: {
        id: params.taskId,
        projectId: params.objectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      include: TASK_FULL_INCLUDE,
    });
    if (!task) return errorResponse('Задание не найдено', 404);

    return successResponse(task);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения задания ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
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

    const body = await req.json();
    const parsed = updateDesignTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.designTask.update({
      where: { id: params.taskId },
      data: {
        ...parsed.data,
        docDate: parsed.data.docDate ? new Date(parsed.data.docDate) : undefined,
      },
      include: TASK_FULL_INCLUDE,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления задания ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
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

    // Каскадное удаление параметров и замечаний настроено в Prisma-схеме (onDelete: Cascade)
    await db.designTask.delete({ where: { id: params.taskId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления задания ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
