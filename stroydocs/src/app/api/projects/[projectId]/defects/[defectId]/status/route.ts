import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';
interface Params { projectId: string; defectId: string }

const changeStatusSchema = z.object({
  status:  z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CONFIRMED', 'REJECTED']),
  comment: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, defectId } = params;

    const existing = await db.defect.findFirst({
      where: { id: defectId, projectId, buildingObject: { organizationId: orgId } },
      select: { id: true, status: true },
    });
    if (!existing) return errorResponse('Дефект не найден', 404);

    const body: unknown = await req.json();
    const parsed = changeStatusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { status, comment } = parsed.data;
    const now = new Date();

    const [updatedDefect] = await db.$transaction([
      // Меняем статус дефекта
      db.defect.update({
        where: { id: defectId },
        data: {
          status,
          ...(status === 'RESOLVED' ? { resolvedAt: now } : {}),
          ...(status === 'OPEN' ? { resolvedAt: null } : {}),
        },
      }),
      // Создаём запись в истории
      db.defectComment.create({
        data: {
          defectId,
          authorId: session.user.id,
          text: comment ?? `Статус изменён: ${status}`,
          statusChange: status,
        },
      }),
    ]);

    await invalidateAnalyticsCache(projectId, orgId);

    return successResponse(updatedDefect);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка смены статуса дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
