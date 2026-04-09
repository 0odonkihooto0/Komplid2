import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { updateProjectSchema } from '@/lib/validations/project';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: {
        id: params.objectId,
        organizationId: session.user.organizationId,
      },
      include: {
        _count: { select: { contracts: true } },
      },
    });

    if (!project) {
      return errorResponse('Проект не найден', 404);
    }

    return successResponse(project);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверка что проект принадлежит организации
    const existing = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!existing) {
      return errorResponse('Проект не найден', 404);
    }

    // Преобразуем строки дат в объекты Date для полей паспорта
    const { permitDate, plannedStartDate, plannedEndDate, ...rest } = parsed.data;
    const project = await db.buildingObject.update({
      where: { id: params.objectId },
      data: {
        ...rest,
        ...(permitDate !== undefined && { permitDate: permitDate ? new Date(permitDate) : null }),
        ...(plannedStartDate !== undefined && { plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null }),
        ...(plannedEndDate !== undefined && { plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null }),
      },
    });

    return successResponse(project);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
