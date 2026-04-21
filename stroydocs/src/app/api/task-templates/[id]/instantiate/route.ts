import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { instantiateTemplateSchema } from '@/lib/validations/task';
import { enqueueNotification } from '@/lib/queue';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const userId = session.user.id;
    const { id } = await params;

    const template = await db.taskTemplate.findFirst({
      where: { id, organizationId: orgId },
      include: {
        taskType: { select: { id: true } },
        group: { select: { id: true } },
      },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    const body: unknown = await req.json();
    const parsed = instantiateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { projectId, deadline, plannedStartDate, executors, controllers, observers } = parsed.data;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) return errorResponse('Объект строительства не найден', 404);

    const task = await db.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          title: template.name,
          description: template.description ?? undefined,
          priority: template.priority,
          duration: template.duration ?? undefined,
          deadline: deadline ? new Date(deadline) : undefined,
          plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : undefined,
          projectId,
          createdById: userId,
          templateId: template.id,
          typeId: template.typeId ?? undefined,
          groupId: template.groupId ?? undefined,
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

      return newTask;
    });

    // Уведомить исполнителей и контролёров
    const usersToNotify = Array.from(new Set([...executors, ...controllers]));
    const users = await db.user.findMany({
      where: { id: { in: usersToNotify } },
      select: { id: true, email: true },
    });

    // Собираем данные для пакетного создания уведомлений
    const notifications = users.map((user) => ({
      type: 'task_assigned',
      title: 'Вам назначена задача',
      body: `«${task.title}»`,
      userId: user.id,
      entityType: 'Task',
      entityId: task.id,
      entityName: task.title,
    }));
    const queueItems = users.map((user) => ({
      userId: user.id,
      email: user.email,
      type: 'task_assigned',
      title: 'Вам назначена задача',
      body: `«${task.title}»`,
      entityType: 'Task',
      entityId: task.id,
      entityName: task.title,
    }));

    await db.notification.createMany({ data: notifications });
    for (const item of queueItems) await enqueueNotification(item);

    return successResponse(task);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-templates/instantiate] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
