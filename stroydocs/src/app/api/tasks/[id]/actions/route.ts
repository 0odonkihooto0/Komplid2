import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { canUserSeeTask } from '@/lib/task-visibility';
import { taskActionSchema } from '@/lib/validations/task';
import { enqueueNotification } from '@/lib/queue';
import { TaskRoleType, TaskStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };

const TERMINAL_STATUSES: TaskStatus[] = ['DONE', 'IRRELEVANT', 'CANCELLED'];

function getUserTaskRoles(userId: string, roles: { userId: string; role: TaskRoleType }[]): TaskRoleType[] {
  return roles.filter((r) => r.userId === userId).map((r) => r.role);
}

function requireRole(userRoles: TaskRoleType[], allowed: TaskRoleType[]): void {
  if (!userRoles.some((r) => allowed.includes(r))) {
    throw errorResponse('Недостаточно прав для выполнения этого действия', 403);
  }
}

function requireStatus(current: TaskStatus, allowed: TaskStatus[]): void {
  if (!allowed.includes(current)) {
    throw errorResponse(
      `Действие недоступно в текущем статусе задачи: ${current}`,
      409
    );
  }
}

async function notifyUsers(
  userIds: string[],
  type: string,
  title: string,
  body: string,
  entityId: string,
  entityName: string
) {
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  for (const user of users) {
    await db.notification
      .create({
        data: { type, title, body, userId: user.id, entityType: 'Task', entityId, entityName },
      })
      .catch(() => {});
    await enqueueNotification({
      userId: user.id,
      email: user.email,
      type,
      title,
      body,
      entityType: 'Task',
      entityId,
      entityName,
    });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
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
    const parsed = taskActionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const input = parsed.data;

    const userRoles = getUserTaskRoles(userId, task.roles);
    const allRoleUserIds = Array.from(new Set(task.roles.map((r) => r.userId)));
    const executorIds = task.roles.filter((r) => r.role === 'EXECUTOR').map((r) => r.userId);
    const controllerIds = task.roles.filter((r) => r.role === 'CONTROLLER').map((r) => r.userId);
    const authorIds = [
      task.createdById,
      ...task.roles.filter((r) => r.role === 'AUTHOR').map((r) => r.userId),
    ];

    const now = new Date();

    switch (input.action) {
      case 'start': {
        requireRole(userRoles, ['EXECUTOR']);
        requireStatus(task.status, ['OPEN', 'PLANNED']);
        await db.task.update({
          where: { id },
          data: { status: 'IN_PROGRESS', actualStartDate: now },
        });
        const notifyIds = Array.from(new Set([...authorIds, ...controllerIds]));
        await notifyUsers(notifyIds, 'task_started', 'Задача взята в работу', `«${task.title}»`, id, task.title);
        break;
      }

      case 'send-to-review': {
        requireRole(userRoles, ['EXECUTOR']);
        requireStatus(task.status, ['IN_PROGRESS', 'REVISION']);
        await db.task.update({ where: { id }, data: { status: 'UNDER_REVIEW' } });
        await notifyUsers(controllerIds, 'task_ready_for_review', 'Задача готова к проверке', `«${task.title}»`, id, task.title);
        break;
      }

      case 'cancel-review': {
        requireRole(userRoles, ['EXECUTOR']);
        requireStatus(task.status, ['UNDER_REVIEW']);
        await db.task.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
        await notifyUsers(controllerIds, 'task_review_cancelled', 'Отправка на проверку отменена', `«${task.title}»`, id, task.title);
        break;
      }

      case 'review-start': {
        requireRole(userRoles, ['CONTROLLER']);
        requireStatus(task.status, ['UNDER_REVIEW']);
        await notifyUsers(executorIds, 'task_review_started', 'Проверка начата', `Контролёр начал проверку задачи «${task.title}»`, id, task.title);
        break;
      }

      case 'accept': {
        requireRole(userRoles, ['CONTROLLER']);
        requireStatus(task.status, ['UNDER_REVIEW']);
        await db.task.update({ where: { id }, data: { status: 'DONE', completedAt: now } });
        const notifyIds = Array.from(new Set([...authorIds, ...executorIds]));
        await notifyUsers(notifyIds, 'task_accepted', 'Задача принята', `«${task.title}» успешно выполнена`, id, task.title);
        break;
      }

      case 'return-to-revision': {
        requireRole(userRoles, ['CONTROLLER']);
        requireStatus(task.status, ['UNDER_REVIEW']);
        await db.task.update({ where: { id }, data: { status: 'REVISION', isReadByAuthor: false } });
        if (input.comment) {
          await db.taskReport.create({
            data: { taskId: id, authorId: userId, progress: input.comment },
          });
        }
        const msg = input.comment ? `«${task.title}». Комментарий: ${input.comment}` : `«${task.title}»`;
        await notifyUsers(executorIds, 'task_returned_to_revision', 'Задача возвращена на доработку', msg, id, task.title);
        break;
      }

      case 'discuss': {
        requireRole(userRoles, ['CONTROLLER']);
        requireStatus(task.status, ['UNDER_REVIEW', 'REVISION']);
        if (input.comment) {
          await db.taskReport.create({
            data: { taskId: id, authorId: userId, progress: input.comment },
          });
          await notifyUsers(executorIds, 'task_report_added', 'Комментарий контролёра', `«${task.title}»: ${input.comment}`, id, task.title);
        }
        break;
      }

      case 'mark-irrelevant': {
        const isAuthorOrController =
          task.createdById === userId || userRoles.some((r) => ['CONTROLLER', 'AUTHOR'].includes(r));
        if (!isAuthorOrController) {
          return errorResponse('Недостаточно прав для этого действия', 403);
        }
        if (TERMINAL_STATUSES.includes(task.status)) {
          return errorResponse('Задача уже в завершённом статусе', 409);
        }
        await db.task.update({ where: { id }, data: { status: 'IRRELEVANT' } });
        await notifyUsers(allRoleUserIds, 'task_irrelevant', 'Задача отмечена как неактуальная', `«${task.title}»`, id, task.title);
        break;
      }

      case 'redirect': {
        requireRole(userRoles, ['EXECUTOR']);
        requireStatus(task.status, ['OPEN', 'PLANNED']);
        const { targetUserId } = input;
        if (targetUserId === userId) {
          return errorResponse('Нельзя перенаправить задачу самому себе', 400);
        }
        await db.$transaction(async (tx) => {
          // Сменить роль вызывающего: EXECUTOR → OBSERVER
          await tx.taskRole.updateMany({
            where: { taskId: id, userId, role: 'EXECUTOR' },
            data: { role: 'OBSERVER' },
          });
          // Добавить нового исполнителя
          await tx.taskRole.createMany({
            data: [{ taskId: id, userId: targetUserId, role: 'EXECUTOR' }],
            skipDuplicates: true,
          });
        });
        await notifyUsers([targetUserId], 'task_assigned', 'Вам назначена задача', `«${task.title}» перенаправлена вам`, id, task.title);
        const notifyIds = Array.from(new Set([...authorIds, ...controllerIds])).filter((uid) => uid !== userId);
        await notifyUsers(notifyIds, 'task_redirected', 'Задача перенаправлена', `«${task.title}»`, id, task.title);
        break;
      }

      case 'delegate': {
        requireRole(userRoles, ['EXECUTOR']);
        requireStatus(task.status, ['IN_PROGRESS']);
        const { targetUserId } = input;
        if (targetUserId === userId) {
          return errorResponse('Нельзя делегировать задачу самому себе', 400);
        }
        await db.taskRole.createMany({
          data: [{ taskId: id, userId: targetUserId, role: 'EXECUTOR' }],
          skipDuplicates: true,
        });
        await notifyUsers([targetUserId], 'task_assigned', 'Вам делегирована задача', `«${task.title}»`, id, task.title);
        break;
      }

      case 'copy': {
        if (userRoles.length === 0 && task.createdById !== userId) {
          return errorResponse('Недостаточно прав для этого действия', 403);
        }
        const newTitle = input.title ?? `Копия: ${task.title}`;
        const newTask = await db.$transaction(async (tx) => {
          const created = await tx.task.create({
            data: {
              title: newTitle,
              description: task.description ?? undefined,
              priority: task.priority,
              duration: task.duration ?? undefined,
              projectId: task.projectId,
              createdById: userId,
              typeId: task.typeId ?? undefined,
              groupId: task.groupId ?? undefined,
              sourceType: 'MANUAL',
              status: 'OPEN',
              isReadByAuthor: true,
            },
          });
          await tx.taskRole.create({
            data: { taskId: created.id, userId, role: 'AUTHOR' },
          });
          return created;
        });
        return successResponse(newTask);
      }

      case 'to-template': {
        const isAuthor =
          task.createdById === userId || userRoles.includes('AUTHOR');
        if (!isAuthor) {
          return errorResponse('Создать шаблон может только автор задачи', 403);
        }
        const orgId2 = session.user.organizationId;
        const template = await db.taskTemplate.create({
          data: {
            name: input.name,
            description: task.description ?? undefined,
            typeId: task.typeId ?? undefined,
            groupId: task.groupId ?? undefined,
            priority: task.priority,
            duration: task.duration ?? undefined,
            organizationId: orgId2,
            authorId: userId,
          },
        });
        return successResponse(template);
      }

      case 'create-subtask': {
        if (userRoles.length === 0 && task.createdById !== userId) {
          return errorResponse('Недостаточно прав для этого действия', 403);
        }
        const subtask = await db.$transaction(async (tx) => {
          const created = await tx.task.create({
            data: {
              title: input.title,
              priority: task.priority,
              projectId: task.projectId,
              groupId: task.groupId ?? undefined,
              parentTaskId: id,
              createdById: userId,
              sourceType: 'MANUAL',
              status: 'OPEN',
              level: task.level + 1,
            },
          });
          const roles = [
            { taskId: created.id, userId, role: 'AUTHOR' as const },
            ...input.executors.map((uid) => ({
              taskId: created.id,
              userId: uid,
              role: 'EXECUTOR' as const,
            })),
          ];
          await tx.taskRole.createMany({ data: roles, skipDuplicates: true });
          return created;
        });
        const uniqueExecutors = Array.from(new Set(input.executors));
        await notifyUsers(uniqueExecutors, 'task_assigned', 'Вам назначена подзадача', `«${subtask.title}»`, subtask.id, subtask.title);
        return successResponse(subtask);
      }
    }

    return successResponse({ id, action: input.action });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/actions] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
