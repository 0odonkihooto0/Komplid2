import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * DELETE — удалить участника объекта (юрлицо или физлицо).
 * Query param: ?type=org|person
 * Cascade в БД автоматически удалит роли и документы о назначении.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; id: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность объекта
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const type = req.nextUrl.searchParams.get('type');
    if (type !== 'org' && type !== 'person') {
      return errorResponse('Укажите тип участника: ?type=org или ?type=person', 400);
    }

    if (type === 'org') {
      const participant = await db.objectOrganization.findFirst({
        where: { id: params.id, buildingObjectId: params.projectId },
      });
      if (!participant) return errorResponse('Участник не найден', 404);

      await db.objectOrganization.delete({ where: { id: params.id } });
    } else {
      const participant = await db.objectPerson.findFirst({
        where: { id: params.id, buildingObjectId: params.projectId },
      });
      if (!participant) return errorResponse('Участник не найден', 404);

      await db.objectPerson.delete({ where: { id: params.id } });
    }

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления участника объекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
