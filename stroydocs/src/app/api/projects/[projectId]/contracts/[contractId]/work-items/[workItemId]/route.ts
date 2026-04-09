import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { updateWorkItemSchema } from '@/lib/validations/work-item';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; workItemId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const workItem = await db.workItem.findFirst({
      where: { id: params.workItemId, contractId: params.contractId },
      include: {
        ksiNode: { select: { id: true, code: true, name: true } },
        _count: { select: { workRecords: true } },
      },
    });
    if (!workItem) return errorResponse('Вид работ не найден', 404);

    return successResponse(workItem);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения вида работ');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; workItemId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = updateWorkItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const workItem = await db.workItem.update({
      where: { id: params.workItemId },
      data: parsed.data,
      include: {
        ksiNode: { select: { id: true, code: true, name: true } },
      },
    });

    return successResponse(workItem);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления вида работ');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; workItemId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверка наличия записей о работах
    const recordsCount = await db.workRecord.count({
      where: { workItemId: params.workItemId },
    });
    if (recordsCount > 0) {
      return errorResponse('Невозможно удалить: есть записи о выполненных работах', 400);
    }

    await db.workItem.delete({ where: { id: params.workItemId } });
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления вида работ');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
