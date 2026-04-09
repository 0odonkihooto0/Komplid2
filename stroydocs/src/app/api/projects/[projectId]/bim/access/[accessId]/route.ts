import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

/** DELETE /api/projects/[projectId]/bim/access/[accessId] — удалить права доступа */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; accessId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности через объект → организацию
    const access = await db.bimAccess.findFirst({
      where: {
        id: params.accessId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
    });
    if (!access) return errorResponse('Запись не найдена', 404);

    await db.bimAccess.delete({ where: { id: params.accessId } });

    return successResponse({ id: params.accessId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM access DELETE failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
