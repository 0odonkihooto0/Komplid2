import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { canUserSeeTask } from '@/lib/task-visibility';
import { updateChecklistItemSchema } from '@/lib/validations/task';

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;
    const orgId = session.user.organizationId;
    const { id, itemId } = await params;

    const task = await db.task.findFirst({
      where: { id, project: { organizationId: orgId } },
      include: {
        roles: true,
        group: { select: { id: true, visibility: true, visibleUserIds: true } },
      },
    });
    if (!task || !canUserSeeTask(userId, task)) {
      return errorResponse('Задача не найдена', 404);
    }

    const item = await db.taskChecklistItem.findFirst({ where: { id: itemId, taskId: id } });
    if (!item) return errorResponse('Пункт чеклиста не найден', 404);

    const body: unknown = await req.json();
    const parsed = updateChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const updated = await db.taskChecklistItem.update({
      where: { id: itemId },
      data: parsed.data,
    });

    // Если все пункты выполнены — уведомить контролёров
    if (updated.done) {
      const undoneCount = await db.taskChecklistItem.count({
        where: { taskId: id, done: false },
      });
      if (undoneCount === 0) {
        const controllerIds = task.roles
          .filter((r) => r.role === 'CONTROLLER')
          .map((r) => r.userId);
        if (controllerIds.length > 0) {
          const users = await db.user.findMany({
            where: { id: { in: controllerIds } },
            select: { id: true },
          });
          for (const user of users) {
            await db.notification
              .create({
                data: {
                  type: 'task_checklist_complete',
                  title: 'Чеклист выполнен',
                  body: `Все пункты чеклиста задачи «${task.title}» отмечены выполненными`,
                  userId: user.id,
                  entityType: 'Task',
                  entityId: id,
                  entityName: task.title,
                },
              })
              .catch(() => {});
          }
        }
      }
    }

    return successResponse(updated);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/checklist/itemId] PATCH:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;
    const orgId = session.user.organizationId;
    const { id, itemId } = await params;

    const task = await db.task.findFirst({
      where: { id, project: { organizationId: orgId } },
      include: {
        roles: true,
        group: { select: { id: true, visibility: true, visibleUserIds: true } },
      },
    });
    if (!task || !canUserSeeTask(userId, task)) {
      return errorResponse('Задача не найдена', 404);
    }

    const item = await db.taskChecklistItem.findFirst({ where: { id: itemId, taskId: id } });
    if (!item) return errorResponse('Пункт чеклиста не найден', 404);

    await db.taskChecklistItem.delete({ where: { id: itemId } });
    return successResponse({ id: itemId });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/checklist/itemId] DELETE:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
