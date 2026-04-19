import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  groupName: z.string().min(1).optional(),
  indicatorName: z.string().min(1).optional(),
  value: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  maxValue: z.string().optional().nullable(),
  fileKeys: z.array(z.string()).optional(),
});

// Вспомогательная функция: получить показатель с проверкой прав
async function resolveIndicator(projectId: string, indicatorId: string, organizationId: string) {
  return db.projectIndicator.findFirst({
    where: {
      id: indicatorId,
      project: { id: projectId, organizationId },
    },
  });
}

// PATCH /api/projects/[projectId]/project-indicators/[indicatorId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; indicatorId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const { organizationId } = session.user;

    const indicator = await resolveIndicator(params.projectId, params.indicatorId, organizationId);
    if (!indicator) return errorResponse('Показатель не найден', 404);

    const body: unknown = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const updated = await db.projectIndicator.update({
      where: { id: params.indicatorId },
      data: parsed.data,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления показателя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE /api/projects/[projectId]/project-indicators/[indicatorId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; indicatorId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const { organizationId } = session.user;

    const indicator = await resolveIndicator(params.projectId, params.indicatorId, organizationId);
    if (!indicator) return errorResponse('Показатель не найден', 404);

    await db.projectIndicator.delete({ where: { id: params.indicatorId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления показателя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
