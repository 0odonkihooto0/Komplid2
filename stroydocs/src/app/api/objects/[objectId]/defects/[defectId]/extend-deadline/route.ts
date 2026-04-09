import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params { objectId: string; defectId: string }

const extendDeadlineSchema = z.object({
  deadline: z.string().datetime('Укажите новый срок в формате ISO 8601'),
  reason: z.string().min(1, 'Укажите причину продления'),
});

// POST /api/objects/[objectId]/defects/[defectId]/extend-deadline — продлить срок устранения
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { objectId, defectId } = params;

    const existing = await db.defect.findFirst({
      where: { id: defectId, projectId: objectId, buildingObject: { organizationId: orgId } },
      select: { id: true, status: true, deadline: true, title: true, assigneeId: true },
    });
    if (!existing) return errorResponse('Дефект не найден', 404);
    if (existing.status === 'CONFIRMED') {
      return errorResponse('Нельзя продлить срок подтверждённого дефекта', 400);
    }

    const body: unknown = await req.json();
    const parsed = extendDeadlineSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const newDeadline = new Date(parsed.data.deadline);

    const [updatedDefect] = await db.$transaction([
      db.defect.update({
        where: { id: defectId },
        data: { deadline: newDeadline },
      }),
      db.defectComment.create({
        data: {
          defectId,
          authorId: session.user.id,
          text: `Срок продлён до ${newDeadline.toLocaleDateString('ru-RU')}. Причина: ${parsed.data.reason}`,
        },
      }),
    ]);

    // Уведомляем ответственного о продлении
    if (existing.assigneeId) {
      await db.notification.create({
        data: {
          type: 'defect_deadline_extended',
          title: 'Срок устранения продлён',
          body: `Срок устранения недостатка «${existing.title}» продлён до ${newDeadline.toLocaleDateString('ru-RU')}`,
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
    logger.error({ err: error }, 'Ошибка продления срока дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
