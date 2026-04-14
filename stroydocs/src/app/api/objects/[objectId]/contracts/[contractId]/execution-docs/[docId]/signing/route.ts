import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; docId: string } };

/** GET — получить маршрут подписания документа */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const route = await db.signingRoute.findUnique({
      where: { executionDocId: params.docId },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, position: true },
            },
          },
        },
      },
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения маршрута подписания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — сбросить маршрут подписания */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const route = await db.signingRoute.findUnique({
      where: { executionDocId: params.docId },
    });
    if (!route) return errorResponse('Маршрут подписания не найден', 404);

    await db.signingRoute.delete({ where: { id: route.id } });

    return successResponse({ message: 'Маршрут подписания сброшен' });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сброса маршрута подписания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
