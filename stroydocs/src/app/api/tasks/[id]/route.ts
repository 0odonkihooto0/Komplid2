import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { canUserSeeTask } from '@/lib/task-visibility';
import { updateTaskSchema } from '@/lib/validations/task';
import { enqueueNotification } from '@/lib/queue';
import { TaskStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };

const TERMINAL_STATUSES: TaskStatus[] = ['DONE', 'IRRELEVANT', 'CANCELLED'];

const fullTaskInclude = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  taskType: { select: { id: true, key: true, name: true } },
  group: { select: { id: true, name: true, visibility: true, visibleUserIds: true } },
  project: { select: { id: true, name: true, organizationId: true } },
  parentTask: { select: { id: true, title: true, status: true } },
  childTasks: {
    select: { id: true, title: true, status: true, priority: true, deadline: true },
    orderBy: { order: 'asc' as const },
  },
  roles: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  labels: {
    include: { label: { select: { id: true, name: true, color: true } } },
  },
  checklist: { orderBy: { order: 'asc' as const } },
  reports: {
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
  _count: { select: { checklist: true, reports: true, childTasks: true } },
};

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;
    const orgId = session.user.organizationId;
    const { id } = await params;

    const task = await db.task.findFirst({
      where: { id, project: { organizationId: orgId } },
      include: fullTaskInclude,
    });

    if (!task || !canUserSeeTask(userId, task)) {
      return errorResponse('Задача не найдена', 404);
    }

    // Пометить как прочитанное для автора
    if (!task.isReadByAuthor && task.roles.some((r) => r.user.id === userId && r.role === 'AUTHOR')) {
      await db.task.update({ where: { id }, data: { isReadByAuthor: true } });
    }

    return successResponse(task);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/id] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;
    const orgId = session.user.organizationId;
    const { id } = await params;

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

    const body: unknown = await req.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const {
      addLabelIds, removeLabelIds,
      addExecutors, removeExecutors,
      addControllers, removeControllers,
      addObservers, removeObservers,
      deadline, plannedStartDate,
      groupId,
      typeId,
      ...scalarFields
    } = parsed.data;

    const userRole = task.roles.find((r) => r.userId === userId)?.role;
    const isAuthor = task.createdById === userId || userRole === 'AUTHOR';

    await db.$transaction(async (tx) => {
      // Обновить скалярные поля
      await tx.task.update({
        where: { id },
        data: {
          ...scalarFields,
          ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
          ...(plannedStartDate !== undefined ? { plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null } : {}),
          ...(groupId !== undefined ? { groupId } : {}),
          ...(typeId !== undefined ? { typeId } : {}),
          ...(!isAuthor ? { isReadByAuthor: false } : {}),
        },
      });

      // Метки
      if (addLabelIds?.length) {
        await tx.taskLabelOnTask.createMany({
          data: addLabelIds.map((labelId) => ({ taskId: id, labelId })),
          skipDuplicates: true,
        });
      }
      if (removeLabelIds?.length) {
        await tx.taskLabelOnTask.deleteMany({
          where: { taskId: id, labelId: { in: removeLabelIds } },
        });
      }

      // Роли
      const addRoles = [
        ...(addExecutors ?? []).map((uid) => ({ taskId: id, userId: uid, role: 'EXECUTOR' as const })),
        ...(addControllers ?? []).map((uid) => ({ taskId: id, userId: uid, role: 'CONTROLLER' as const })),
        ...(addObservers ?? []).map((uid) => ({ taskId: id, userId: uid, role: 'OBSERVER' as const })),
      ];
      if (addRoles.length) {
        await tx.taskRole.createMany({ data: addRoles, skipDuplicates: true });
      }

      const removeUserIds = [
        ...(removeExecutors?.map((uid) => ({ userId: uid, role: 'EXECUTOR' as const })) ?? []),
        ...(removeControllers?.map((uid) => ({ userId: uid, role: 'CONTROLLER' as const })) ?? []),
        ...(removeObservers?.map((uid) => ({ userId: uid, role: 'OBSERVER' as const })) ?? []),
      ];
      for (const { userId: uid, role } of removeUserIds) {
        await tx.taskRole.deleteMany({ where: { taskId: id, userId: uid, role } });
      }
    });

    // Уведомить новых исполнителей и контролёров
    const newUsersToNotify = Array.from(new Set([...(addExecutors ?? []), ...(addControllers ?? [])]));
    if (newUsersToNotify.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: newUsersToNotify } },
        select: { id: true, email: true },
      });
      for (const user of users) {
        await db.notification.create({
          data: {
            type: 'task_assigned',
            title: 'Вам назначена задача',
            body: `«${task.title}»`,
            userId: user.id,
            entityType: 'Task',
            entityId: id,
            entityName: task.title,
          },
        }).catch(() => {});
        await enqueueNotification({
          userId: user.id,
          email: user.email,
          type: 'task_assigned',
          title: 'Вам назначена задача',
          body: `«${task.title}»`,
          entityType: 'Task',
          entityId: id,
          entityName: task.title,
        });
      }
    }

    const updated = await db.task.findFirst({ where: { id }, include: fullTaskInclude });
    return successResponse(updated);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/id] PATCH:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;
    const orgId = session.user.organizationId;
    const { id } = await params;

    const task = await db.task.findFirst({
      where: { id, project: { organizationId: orgId } },
      include: { roles: true, group: { select: { id: true, visibility: true, visibleUserIds: true } } },
    });

    if (!task || !canUserSeeTask(userId, task)) {
      return errorResponse('Задача не найдена', 404);
    }

    const isAuthor =
      task.createdById === userId ||
      task.roles.some((r) => r.userId === userId && r.role === 'AUTHOR');
    if (!isAuthor) {
      return errorResponse('Удалять задачу может только автор', 403);
    }

    if (TERMINAL_STATUSES.includes(task.status)) {
      return errorResponse('Нельзя удалить завершённую задачу', 409);
    }

    await db.task.delete({ where: { id } });
    return successResponse({ id });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/id] DELETE:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
