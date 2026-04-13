import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка принадлежности версии к объекту
    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.projectId },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    const takeRaw = parseInt(req.nextUrl.searchParams.get('take') ?? '50');
    const skipRaw = parseInt(req.nextUrl.searchParams.get('skip') ?? '0');
    const take = Math.min(200, Math.max(1, isNaN(takeRaw) ? 50 : takeRaw));
    const skip = Math.max(0, isNaN(skipRaw) ? 0 : skipRaw);

    const [logs, total] = await Promise.all([
      db.ganttChangeLog.findMany({
        where: { versionId: params.versionId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      db.ganttChangeLog.count({ where: { versionId: params.versionId } }),
    ]);

    return successResponse(logs, {
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения журнала изменений ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
