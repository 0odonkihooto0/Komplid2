import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { buildTaskVisibilityWhere } from '@/lib/task-visibility';
import { createTaskSchema } from '@/lib/validations/task';
import { enqueueNotification } from '@/lib/queue';
import { Prisma, TaskStatus } from '@prisma/client';

const TERMINAL_STATUSES: TaskStatus[] = ['DONE', 'IRRELEVANT', 'CANCELLED'];

const taskInclude = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  taskType: { select: { id: true, key: true, name: true } },
  group: { select: { id: true, name: true, visibility: true, visibleUserIds: true } },
  roles: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  labels: {
    include: { label: { select: { id: true, name: true, color: true } } },
  },
  _count: { select: { checklist: true, reports: true, childTasks: true } },
} satisfies Prisma.TaskInclude;

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    const grouping = searchParams.get('grouping') ?? 'all';
    const groupId = searchParams.get('groupId');
    const typeId = searchParams.get('typeId');
    const search = searchParams.get('search');
    const visibleTo = searchParams.get('visibleTo');
    const labelIdsParam = searchParams.get('labelIds');
    const labelIds = labelIdsParam ? labelIdsParam.split(',').filter(Boolean) : [];

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const skip = (page - 1) * pageSize;

    const sortBy = searchParams.get('sortBy') ?? 'createdAt';
    const sortDir = (searchParams.get('sortDir') ?? 'desc') as 'asc' | 'desc';

    const now = new Date();

    // Базовый фильтр видимости
    const visibilityWhere = visibleTo === 'me'
      ? buildTaskVisibilityWhere(userId, orgId)
      : { project: { organizationId: orgId } };

    // Дополнительные фильтры
    const additionalFilters: Prisma.TaskWhereInput = {
      ...(groupId ? { groupId } : {}),
      ...(typeId ? { typeId } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(labelIds.length > 0 ? { labels: { some: { labelId: { in: labelIds } } } } : {}),
    };

    // Фильтр по группировке
    const groupingFilter: Prisma.TaskWhereInput = (() => {
      switch (grouping) {
        case 'active':
          return { status: { in: ['IN_PROGRESS', 'UNDER_REVIEW', 'REVISION'] as TaskStatus[] } };
        case 'executor':
          return { roles: { some: { userId, role: 'EXECUTOR' } } };
        case 'controller':
          return { roles: { some: { userId, role: 'CONTROLLER' } } };
        case 'observer':
          return { roles: { some: { userId, role: 'OBSERVER' } } };
        case 'author':
          return { OR: [{ createdById: userId }, { roles: { some: { userId, role: 'AUTHOR' } } }] };
        case 'irrelevant':
          return { status: 'IRRELEVANT' };
        case 'overdue':
          return { deadline: { lt: now }, status: { notIn: TERMINAL_STATUSES } };
        case 'completed':
          return { status: 'DONE' };
        default:
          return {};
      }
    })();

    const baseWhere: Prisma.TaskWhereInput = {
      ...visibilityWhere,
      ...additionalFilters,
      ...groupingFilter,
    };

    const orderBy: Prisma.TaskOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'deadline': return { deadline: sortDir };
        case 'priority': return { priority: sortDir };
        case 'title': return { title: sortDir };
        default: return { createdAt: sortDir };
      }
    })();

    // Параллельно: список задач, общий count, counts по группировкам
    const [tasks, total, countsArr] = await Promise.all([
      db.task.findMany({
        where: baseWhere,
        include: taskInclude,
        orderBy,
        take: pageSize,
        skip,
      }),
      db.task.count({ where: baseWhere }),
      Promise.all([
        db.task.count({ where: { ...visibilityWhere, ...additionalFilters } }),
        db.task.count({ where: { ...visibilityWhere, ...additionalFilters, status: { in: ['IN_PROGRESS', 'UNDER_REVIEW', 'REVISION'] as TaskStatus[] } } }),
        db.task.count({ where: { ...visibilityWhere, ...additionalFilters, roles: { some: { userId, role: 'EXECUTOR' } } } }),
        db.task.count({ where: { ...visibilityWhere, ...additionalFilters, roles: { some: { userId, role: 'CONTROLLER' } } } }),
        db.task.count({ where: { ...visibilityWhere, ...additionalFilters, roles: { some: { userId, role: 'OBSERVER' } } } }),
        db.task.count({ where: { ...visibilityWhere, ...additionalFilters, OR: [{ createdById: userId }, { roles: { some: { userId, role: 'AUTHOR' } } }] } }),
        db.task.count({ where: { ...visibilityWhere, ...additionalFilters, status: 'IRRELEVANT' } }),
        db.task.count({ where: { ...visibilityWhere, ...additionalFilters, deadline: { lt: now }, status: { notIn: TERMINAL_STATUSES } } }),
        db.task.count({ where: { ...visibilityWhere, ...additionalFilters, status: 'DONE' } }),
      ]),
    ]);

    const [all, active, executor, controller, observer, author, irrelevant, overdue, completed] = countsArr;
    const counts = { all, active, executor, controller, observer, author, irrelevant, overdue, completed };

    return successResponse(
      { tasks, counts },
      {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const userId = session.user.id;

    const body: unknown = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const {
      projectId, groupId, typeId, templateId, parentTaskId,
      executors, controllers, observers, labelIds,
      deadline, plannedStartDate,
      ...rest
    } = parsed.data;

    // Верификация объекта строительства
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) return errorResponse('Объект строительства не найден', 404);

    if (groupId) {
      const group = await db.taskGroup.findFirst({ where: { id: groupId, organizationId: orgId } });
      if (!group) return errorResponse('Группа задач не найдена', 404);
    }
    if (typeId) {
      const type = await db.taskType.findFirst({
        where: { id: typeId, OR: [{ isSystem: true }, { organizationId: orgId }] },
      });
      if (!type) return errorResponse('Тип задачи не найден', 404);
    }

    const task = await db.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          ...rest,
          deadline: deadline ? new Date(deadline) : undefined,
          plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : undefined,
          projectId,
          groupId: groupId ?? undefined,
          typeId: typeId ?? undefined,
          templateId: templateId ?? undefined,
          parentTaskId: parentTaskId ?? undefined,
          createdById: userId,
          sourceType: 'MANUAL',
          status: 'OPEN',
        },
      });

      const roles = [
        { taskId: newTask.id, userId, role: 'AUTHOR' as const },
        ...executors.map((uid) => ({ taskId: newTask.id, userId: uid, role: 'EXECUTOR' as const })),
        ...controllers.map((uid) => ({ taskId: newTask.id, userId: uid, role: 'CONTROLLER' as const })),
        ...observers.map((uid) => ({ taskId: newTask.id, userId: uid, role: 'OBSERVER' as const })),
      ];
      await tx.taskRole.createMany({ data: roles, skipDuplicates: true });

      if (labelIds.length > 0) {
        await tx.taskLabelOnTask.createMany({
          data: labelIds.map((labelId) => ({ taskId: newTask.id, labelId })),
          skipDuplicates: true,
        });
      }

      return newTask;
    });

    // Уведомить исполнителей и контролёров
    const usersToNotify = Array.from(new Set([...executors, ...controllers]));
    if (usersToNotify.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: usersToNotify } },
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
            entityId: task.id,
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
          entityId: task.id,
          entityName: task.title,
        });
      }
    }

    return successResponse(task);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
