import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateProjectEventSchema } from '@/lib/validations/project-event';
import { getNotificationQueue } from '@/lib/queue';

export const dynamic = 'force-dynamic';

type Params = { objectId: string; eventId: string };

// Вспомогательная: проверить доступ к мероприятию
async function findEvent(projectId: string, eventId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  return db.projectEvent.findFirst({
    where: { id: eventId, projectId },
    include: {
      organizer: { select: { id: true, firstName: true, lastName: true, email: true } },
      contract: { select: { id: true, number: true, name: true } },
    },
  });
}

// Получить детали мероприятия
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const event = await findEvent(params.objectId, params.eventId, session.user.organizationId);
    if (!event) return errorResponse('Мероприятие не найдено', 404);

    return successResponse(event);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения мероприятия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Обновить мероприятие (статус, детали, протокол)
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const event = await findEvent(params.objectId, params.eventId, session.user.organizationId);
    if (!event) return errorResponse('Мероприятие не найдено', 404);

    const body = await req.json();
    const parsed = updateProjectEventSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { scheduledAt, contractId, participantIds, ...rest } = parsed.data;

    const updated = await db.projectEvent.update({
      where: { id: params.eventId },
      data: {
        ...rest,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(contractId !== undefined ? { contractId } : {}),
        ...(participantIds !== undefined ? { participantIds } : {}),
      },
      include: {
        organizer: { select: { id: true, firstName: true, lastName: true } },
        contract: { select: { id: true, number: true, name: true } },
      },
    });

    // При изменении даты — заменить задание напоминания
    if (scheduledAt) {
      const queue = getNotificationQueue();
      await queue.remove(`event-reminder-${params.eventId}`).catch(() => null);

      const newScheduledAt = new Date(scheduledAt);
      const notifyAt = new Date(newScheduledAt);
      notifyAt.setDate(notifyAt.getDate() - updated.notifyDays);
      const delayMs = notifyAt.getTime() - Date.now();

      if (delayMs > 0) {
        await queue.add(
          'send-email',
          {
            userId: updated.organizerId,
            email: session.user.email ?? '',
            type: 'event_reminder',
            title: `Напоминание: ${updated.title}`,
            body: `Мероприятие «${updated.title}» состоится ${newScheduledAt.toLocaleDateString('ru-RU')}`,
            entityType: 'project_event',
            entityId: updated.id,
            entityName: updated.title,
          },
          { delay: delayMs, jobId: `event-reminder-${params.eventId}` },
        );
      }
    }

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления мероприятия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Удалить мероприятие
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const event = await findEvent(params.objectId, params.eventId, session.user.organizationId);
    if (!event) return errorResponse('Мероприятие не найдено', 404);

    // Отменить запланированное уведомление
    const queue = getNotificationQueue();
    await queue.remove(`event-reminder-${params.eventId}`).catch(() => null);

    await db.projectEvent.delete({ where: { id: params.eventId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления мероприятия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
