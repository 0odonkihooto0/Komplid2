import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params { objectId: string; defectId: string }

const acceptSchema = z.object({
  comment: z.string().optional(),
});

// POST /api/objects/[objectId]/defects/[defectId]/accept — принять устранение недостатка
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { objectId, defectId } = params;

    const existing = await db.defect.findFirst({
      where: { id: defectId, projectId: objectId, buildingObject: { organizationId: orgId } },
      select: { id: true, status: true, assigneeId: true, title: true },
    });
    if (!existing) return errorResponse('Дефект не найден', 404);
    if (existing.status !== 'RESOLVED') {
      return errorResponse('Принять можно только устранённый дефект', 400);
    }

    const body: unknown = await req.json();
    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const [updatedDefect] = await db.$transaction([
      db.defect.update({
        where: { id: defectId },
        data: { status: 'CONFIRMED' },
      }),
      db.defectComment.create({
        data: {
          defectId,
          authorId: session.user.id,
          text: parsed.data.comment ?? 'Устранение подтверждено',
          statusChange: 'CONFIRMED',
        },
      }),
    ]);

    // Уведомляем ответственного
    if (existing.assigneeId) {
      await db.notification.create({
        data: {
          type: 'defect_confirmed',
          title: 'Устранение подтверждено',
          body: `Устранение недостатка «${existing.title}» подтверждено стройконтролем`,
          userId: existing.assigneeId,
          entityType: 'Defect',
          entityId: defectId,
          entityName: existing.title,
        },
      });
    }

    await invalidateAnalyticsCache(objectId, orgId);

    return successResponse(updatedDefect);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка подтверждения устранения дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
