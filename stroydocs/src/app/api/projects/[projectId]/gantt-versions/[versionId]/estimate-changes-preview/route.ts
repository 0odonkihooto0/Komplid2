import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { buildEstimateChangesPreview } from '@/lib/gantt/estimate-changes-preview';

export const dynamic = 'force-dynamic';

const previewSchema = z.object({
  estimateVersionId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем версию ГПР
    const version = await db.ganttVersion.findFirst({
      where: {
        id: params.versionId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    const body = await req.json();
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверяем что EstimateVersion принадлежит объекту этой организации
    const estimateVersion = await db.estimateVersion.findFirst({
      where: {
        id: parsed.data.estimateVersionId,
        contract: {
          buildingObject: {
            id: params.projectId,
            organizationId: session.user.organizationId,
          },
        },
      },
    });
    if (!estimateVersion) {
      return errorResponse('Версия сметы не найдена', 404);
    }

    const result = await buildEstimateChangesPreview(
      params.versionId,
      parsed.data.estimateVersionId,
    );

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка предпросмотра изменений сметы в ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
