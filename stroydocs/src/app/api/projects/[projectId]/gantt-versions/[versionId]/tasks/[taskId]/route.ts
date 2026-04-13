import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { calculateCriticalPath } from '@/lib/gantt/critical-path';
import { logGanttChange } from '@/lib/gantt/log-change';

export const dynamic = 'force-dynamic';

const updateTaskSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  planStart: z.string().datetime().optional(),
  planEnd: z.string().datetime().optional(),
  factStart: z.string().datetime().nullable().optional(),
  factEnd: z.string().datetime().nullable().optional(),
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ON_HOLD']).optional(),
  workItemId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string; taskId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const task = await db.ganttTask.findFirst({
      where: { id: params.taskId, versionId: params.versionId },
    });
    if (!task) return errorResponse('Задача не найдена', 404);

    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { planStart, planEnd, factStart, factEnd, ...rest } = parsed.data;

    const updated = await db.ganttTask.update({
      where: { id: params.taskId },
      data: {
        ...rest,
        ...(planStart !== undefined && { planStart: new Date(planStart) }),
        ...(planEnd !== undefined && { planEnd: new Date(planEnd) }),
        ...(factStart !== undefined && { factStart: factStart ? new Date(factStart) : null }),
        ...(factEnd !== undefined && { factEnd: factEnd ? new Date(factEnd) : null }),
      },
      include: { workItem: { select: { id: true, name: true, projectCipher: true } } },
    });

    // Логируем изменения в журнал ГПР (fire-and-forget)
    const { planStart: _ps, planEnd: _pe, factStart: _fs, factEnd: _fe, ...restFields } = parsed.data;
    const loggableFields: Record<string, unknown> = {
      ...(restFields as Record<string, unknown>),
      ...(planStart !== undefined && { planStart }),
      ...(planEnd !== undefined && { planEnd }),
      ...(factStart !== undefined && { factStart: factStart ?? null }),
      ...(factEnd !== undefined && { factEnd: factEnd ?? null }),
    };
    for (const [field, newRaw] of Object.entries(loggableFields)) {
      if (newRaw === undefined) continue;
      const oldRaw = task[field as keyof typeof task];
      const oldVal = oldRaw != null ? String(oldRaw) : null;
      const newVal = newRaw != null ? String(newRaw) : null;
      if (oldVal !== newVal) {
        void logGanttChange({
          versionId: params.versionId,
          userId: session.user.id,
          action: 'UPDATE',
          taskId: params.taskId,
          fieldName: field,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }

    // Пересчитываем критический путь при изменении плановых дат
    if (planStart !== undefined || planEnd !== undefined) {
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
    }

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления задачи ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; versionId: string; taskId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const task = await db.ganttTask.findFirst({
      where: { id: params.taskId, versionId: params.versionId },
    });
    if (!task) return errorResponse('Задача не найдена', 404);

    await deleteTaskRecursive(params.taskId);

    // Логируем удаление в журнал ГПР (fire-and-forget)
    void logGanttChange({
      versionId: params.versionId,
      userId: session.user.id,
      action: 'DELETE',
      taskId: params.taskId,
      oldValue: task.name,
    });

    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления задачи ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

async function deleteTaskRecursive(taskId: string): Promise<void> {
  const children = await db.ganttTask.findMany({ where: { parentId: taskId } });
  for (const child of children) {
    await deleteTaskRecursive(child.id);
  }
  await db.ganttTask.delete({ where: { id: taskId } });
}
