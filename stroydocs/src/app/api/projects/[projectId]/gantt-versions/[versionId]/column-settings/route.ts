import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const columnSettingsSchema = z.object({
  visibleColumns: z.array(z.string().min(1).max(100)),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности версии к объекту организации
    const version = await db.ganttVersion.findFirst({
      where: {
        id: params.versionId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    const body = await req.json();
    const parsed = columnSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.ganttVersion.update({
      where: { id: params.versionId },
      data: {
        columnSettings: { visibleColumns: parsed.data.visibleColumns },
      },
      select: { id: true, columnSettings: true },
    });

    return successResponse(updated.columnSettings);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления настроек видимости колонок ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
