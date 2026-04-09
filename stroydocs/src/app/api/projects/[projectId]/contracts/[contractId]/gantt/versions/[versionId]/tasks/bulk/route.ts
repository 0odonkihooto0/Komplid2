import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { calculateCriticalPath } from '@/lib/gantt/critical-path';

export const dynamic = 'force-dynamic';

const bulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      planStart: z.string().datetime().optional(),
      planEnd: z.string().datetime().optional(),
      progress: z.number().min(0).max(100).optional(),
      sortOrder: z.number().int().optional(),
    }),
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    const body = await req.json();
    const parsed = bulkUpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { updates } = parsed.data;
    if (updates.length === 0) return successResponse({ updated: 0 });

    await db.$transaction(async (tx) => {
      for (const u of updates) {
        const { id, planStart, planEnd, progress, sortOrder } = u;
        await tx.ganttTask.update({
          where: { id },
          data: {
            ...(planStart !== undefined && { planStart: new Date(planStart) }),
            ...(planEnd !== undefined && { planEnd: new Date(planEnd) }),
            ...(progress !== undefined && { progress }),
            ...(sortOrder !== undefined && { sortOrder }),
          },
        });
      }
    });

    // Пересчитать критический путь
    const [allTasks, allDeps] = await Promise.all([
      db.ganttTask.findMany({ where: { versionId: params.versionId } }),
      db.ganttDependency.findMany({ where: { predecessor: { versionId: params.versionId } } }),
    ]);
    const criticalIds = new Set(calculateCriticalPath(allTasks, allDeps));

    await db.$transaction(
      allTasks.map((t) =>
        db.ganttTask.update({
          where: { id: t.id },
          data: { isCritical: criticalIds.has(t.id) },
        }),
      ),
    );

    return successResponse({ updated: updates.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка массового обновления задач графика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
