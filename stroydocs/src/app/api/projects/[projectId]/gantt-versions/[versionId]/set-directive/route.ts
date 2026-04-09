import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const version = await db.ganttVersion.findFirst({
      where: {
        id: params.versionId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    await db.$transaction(async (tx) => {
      // Снимаем флаг директивной у всех версий этого объекта в той же стадии
      await tx.ganttVersion.updateMany({
        where: {
          projectId: params.projectId,
          stageId: version.stageId ?? undefined,
          id: { not: params.versionId },
        },
        data: { isDirective: false },
      });

      // Устанавливаем текущую версию как директивную
      await tx.ganttVersion.update({
        where: { id: params.versionId },
        data: { isDirective: true },
      });
    });

    return successResponse({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка установки директивной версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
