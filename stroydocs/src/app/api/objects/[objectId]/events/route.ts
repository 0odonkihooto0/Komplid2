import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createProjectEventSchema } from '@/lib/validations/project-event';
import { getNotificationQueue } from '@/lib/queue';
import type { ProjectEventType, ProjectEventStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Получить список мероприятий проекта
export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const events = await db.projectEvent.findMany({
      where: {
        projectId: params.objectId,
        ...(eventType ? { eventType: eventType as ProjectEventType } : {}),
        ...(status ? { status: status as ProjectEventStatus } : {}),
        ...(from || to
          ? {
              scheduledAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        organizer: { select: { id: true, firstName: true, lastName: true, email: true } },
        contract: { select: { id: true, number: true, name: true } },
      },
    });

    return successResponse(events);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения мероприятий проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Создать мероприятие
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createProjectEventSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { contractId, participantIds, scheduledAt, ...rest } = parsed.data;

    // Если указан договор — проверить что он принадлежит проекту
    if (contractId) {
      const contract = await db.contract.findFirst({
        where: { id: contractId, projectId: params.objectId },
      });
      if (!contract) return errorResponse('Договор не найден', 404);
    }

    const event = await db.projectEvent.create({
      data: {
        ...rest,
        scheduledAt: new Date(scheduledAt),
        projectId: params.objectId,
        organizerId: session.user.id,
        ...(contractId ? { contractId } : {}),
        participantIds: participantIds ?? [],
      },
      include: {
        organizer: { select: { id: true, firstName: true, lastName: true } },
        contract: { select: { id: true, number: true, name: true } },
      },
    });

    // Запланировать уведомление за N дней до мероприятия
    const notifyAt = new Date(event.scheduledAt);
    notifyAt.setDate(notifyAt.getDate() - event.notifyDays);
    const delayMs = notifyAt.getTime() - Date.now();

    if (delayMs > 0) {
      const queue = getNotificationQueue();
      await queue.add(
        'send-email',
        {
          userId: session.user.id,
          email: session.user.email ?? '',
          type: 'event_reminder',
          title: `Напоминание: ${event.title}`,
          body: `Мероприятие «${event.title}» состоится ${event.scheduledAt.toLocaleDateString('ru-RU')}`,
          entityType: 'project_event',
          entityId: event.id,
          entityName: event.title,
        },
        { delay: delayMs, jobId: `event-reminder-${event.id}` },
      );
    }

    return successResponse(event);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания мероприятия проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
