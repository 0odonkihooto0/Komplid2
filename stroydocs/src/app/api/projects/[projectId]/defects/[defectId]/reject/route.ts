import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; defectId: string }

const rejectSchema = z.object({
  comment: z.string().min(1, 'Укажите причину возврата'),
});

// POST /api/projects/[projectId]/defects/[defectId]/reject — вернуть на доработку
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, defectId } = params;

    const existing = await db.defect.findFirst({
      where: { id: defectId, projectId, buildingObject: { organizationId: orgId } },
      select: { id: true, status: true, assigneeId: true, title: true },
    });
    if (!existing) return errorResponse('Дефект не найден', 404);
    if (existing.status !== 'RESOLVED') {
      return errorResponse('Вернуть на доработку можно только устранённый дефект', 400);
    }

    const body: unknown = await req.json();
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const [updatedDefect] = await db.$transaction([
      db.defect.update({
        where: { id: defectId },
        data: { status: 'IN_PROGRESS', resolvedAt: null },
      }),
      db.defectComment.create({
        data: {
          defectId,
          authorId: session.user.id,
          text: parsed.data.comment,
          statusChange: 'REJECTED',
        },
      }),
    ]);

    // Уведомляем ответственного о возврате
    if (existing.assigneeId) {
      await db.notification.create({
        data: {
          type: 'defect_rejected',
          title: 'Недостаток возвращён на доработку',
          body: `Недостаток «${existing.title}» возвращён на доработку: ${parsed.data.comment}`,
          userId: existing.assigneeId,
          entityType: 'Defect',
          entityId: defectId,
          entityName: existing.title,
        },
      });
    }

    await invalidateAnalyticsCache(projectId, orgId);

    return successResponse(updatedDefect);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка возврата дефекта на доработку');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
