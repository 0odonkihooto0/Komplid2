import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { canUserSeeTask } from '@/lib/task-visibility';
import { createTaskReportSchema } from '@/lib/validations/task';
import { enqueueNotification } from '@/lib/queue';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
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

    const reports = await db.taskReport.findMany({
      where: { taskId: id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(reports);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/reports] GET:', err);
    return errorResponse('Ошибка сервера', 500);
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

    // Только исполнитель может добавлять отчёты
    const isExecutor = task.roles.some((r) => r.userId === userId && r.role === 'EXECUTOR');
    if (!isExecutor) {
      return errorResponse('Добавлять отчёты о выполнении может только исполнитель', 403);
    }

    const body: unknown = await req.json();
    const parsed = createTaskReportSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { progress, newDeadline, s3Keys } = parsed.data;

    const report = await db.$transaction(async (tx) => {
      const newReport = await tx.taskReport.create({
        data: {
          taskId: id,
          authorId: userId,
          progress,
          newDeadline: newDeadline ? new Date(newDeadline) : undefined,
          s3Keys,
        },
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
      });

      // Обновить deadline и пометить как непрочитанное для автора
      await tx.task.update({
        where: { id },
        data: {
          ...(newDeadline ? { deadline: new Date(newDeadline) } : {}),
          isReadByAuthor: false,
        },
      });

      return newReport;
    });

    // Уведомить авторов и контролёров
    const authorIds = [
      task.createdById,
      ...task.roles.filter((r) => r.role === 'AUTHOR').map((r) => r.userId),
    ];
    const controllerIds = task.roles.filter((r) => r.role === 'CONTROLLER').map((r) => r.userId);
    const notifyIds = Array.from(new Set([...authorIds, ...controllerIds])).filter((uid) => uid !== userId);

    const users = await db.user.findMany({
      where: { id: { in: notifyIds } },
      select: { id: true, email: true },
    });
    for (const user of users) {
      await db.notification
        .create({
          data: {
            type: 'task_report_added',
            title: 'Новый отчёт по задаче',
            body: `«${task.title}»: ${progress.slice(0, 100)}${progress.length > 100 ? '...' : ''}`,
            userId: user.id,
            entityType: 'Task',
            entityId: id,
            entityName: task.title,
          },
        })
        .catch(() => {});
      await enqueueNotification({
        userId: user.id,
        email: user.email,
        type: 'task_report_added',
        title: 'Новый отчёт по задаче',
        body: `«${task.title}»: ${progress.slice(0, 100)}`,
        entityType: 'Task',
        entityId: id,
        entityName: task.title,
      });
    }

    return successResponse(report);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/reports] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
