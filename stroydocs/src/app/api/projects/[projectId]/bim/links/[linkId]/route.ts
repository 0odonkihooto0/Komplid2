import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
/** DELETE /api/projects/[projectId]/bim/links/[linkId] — удалить связь */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; linkId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверить принадлежность связи через модель → проект → организацию
    const link = await db.bimElementLink.findFirst({
      where: {
        id: params.linkId,
        model: {
          projectId: params.projectId,
          buildingObject: { organizationId: session.user.organizationId },
        },
      },
    });
    if (!link) return errorResponse('Связь не найдена', 404);

    await db.bimElementLink.delete({ where: { id: params.linkId } });

    return successResponse({ id: params.linkId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM link DELETE failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
