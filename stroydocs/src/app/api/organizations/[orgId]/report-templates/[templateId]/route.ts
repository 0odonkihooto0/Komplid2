import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { orgId: string; templateId: string }

/** DELETE /api/organizations/[orgId]/report-templates/[templateId] — удалить шаблон */
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { orgId: requestedOrgId, templateId } = params;

    if (requestedOrgId !== orgId) {
      return errorResponse('Недостаточно прав', 403);
    }

    // Можно удалять только пользовательские шаблоны своей организации
    const template = await db.reportTemplate.findFirst({
      where: {
        id: templateId,
        organizationId: orgId,
        isSystem: false,
      },
      select: { id: true },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    await db.reportTemplate.delete({ where: { id: templateId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления шаблона отчётов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
