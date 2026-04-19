import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

const LIMIT = 50;

/*
 * История изменений паспорта объекта.
 *
 * Возвращает записи ActivityLog, связанные с данным BuildingObject,
 * отсортированные от новых к старым (take: 50).
 *
 * Примечание: на момент внедрения UI в кодовой базе нет производителей
 * записей `ActivityLog` (grep db.activityLog.create → 0 совпадений).
 * Эндпоинт вернёт пустой список на существующих объектах, пока не будут
 * добавлены вызовы `db.activityLog.create()` в соответствующих мутациях.
 */

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const organizationId = session.user.organizationId;

    // Сначала проверяем, что объект принадлежит организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId },
      select: { id: true },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    const entries = await db.activityLog.findMany({
      where: {
        organizationId,
        entityType: 'BuildingObject',
        entityId: params.projectId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
    });

    return successResponse(
      entries.map((e) => ({
        id: e.id,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        entityName: e.entityName,
        createdAt: e.createdAt.toISOString(),
        user: e.user
          ? {
              id: e.user.id,
              fullName: `${e.user.lastName} ${e.user.firstName}`.trim(),
            }
          : null,
      }))
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки истории паспорта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
