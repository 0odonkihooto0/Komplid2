import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; defectId: string; refId: string }

// DELETE /api/projects/[projectId]/defects/[defectId]/normative-refs/[refId] — удалить ссылку
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    // Проверяем доступ: ссылка → дефект → объект → организация
    const ref = await db.defectNormativeRef.findFirst({
      where: {
        id: params.refId,
        defectId: params.defectId,
        defect: {
          projectId: params.projectId,
          buildingObject: { organizationId: orgId },
        },
      },
      select: { id: true },
    });
    if (!ref) return errorResponse('Ссылка не найдена', 404);

    await db.defectNormativeRef.delete({ where: { id: params.refId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления нормативной ссылки дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
