/**
 * Cron-эндпоинт уведомлений о приближающемся сроке исполнения предписаний СК.
 *
 * Логика: рассылает уведомление ответственному (responsibleId) когда
 * до deadline предписания остаётся ≤3 календарных дня.
 * Идемпотентность: повторный запуск в тот же день не создаёт дубликатов.
 *
 * Расписание: 0 6 * * 1-5 (09:00 МСК, Пн–Пт)
 * Авторизация: Bearer CRON_SECRET
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { enqueueNotification } from '@/lib/queue';
import { successResponse, errorResponse } from '@/utils/api';
import { secureCompare } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Аутентификация по Bearer-токену (аналог inspection-reminder)
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    const secret = process.env.CRON_SECRET;

    if (!secret || !secureCompare(token, secret)) {
      return errorResponse('Unauthorized', 401);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfToday = new Date(today);

    // Горизонт: 3 календарных дня
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 3);

    // Активные предписания с установленным дедлайном в горизонте ≤3 дней
    const prescriptions = await db.prescription.findMany({
      where: {
        status: 'ACTIVE',
        deadline: { gte: today, lte: horizon },
        responsibleId: { not: null },
      },
      include: {
        responsible: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        inspection: {
          include: {
            buildingObject: { select: { name: true } },
          },
        },
      },
    });

    let sentCount = 0;

    // Идемпотентность: один запрос вместо N для проверки уже отправленных уведомлений
    const prescriptionIds = prescriptions.map((p) => p.id);
    const alreadySentNotifications = await db.notification.findMany({
      where: {
        type: 'prescription_deadline',
        entityId: { in: prescriptionIds },
        createdAt: { gte: startOfToday },
      },
      select: { entityId: true },
    });
    const sentIds = new Set(alreadySentNotifications.map((n) => n.entityId).filter(Boolean) as string[]);

    for (const prescription of prescriptions) {
      if (!prescription.responsible || !prescription.deadline) continue;

      if (sentIds.has(prescription.id)) continue;

      const daysLeft = Math.ceil(
        (prescription.deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const objectName = prescription.inspection.buildingObject.name;
      const deadlineStr = prescription.deadline.toLocaleDateString('ru-RU');
      const typeLabel =
        prescription.type === 'DEFECT_ELIMINATION'
          ? 'устранения недостатков'
          : 'возобновления работ';

      const title = `Предписание № ${prescription.number}: до срока ${typeLabel} ${daysLeft} дн.`;
      const body =
        `Объект: ${objectName}. ` +
        `Срок исполнения предписания № ${prescription.number}: ${deadlineStr}. ` +
        `Осталось: ${daysLeft} календ. дн.`;

      try {
        // Уведомление в БД
        await db.notification.create({
          data: {
            userId: prescription.responsible.id,
            type: 'prescription_deadline',
            title,
            body,
            entityType: 'Prescription',
            entityId: prescription.id,
            entityName: `Предписание № ${prescription.number}`,
          },
        });

        // Email через BullMQ-очередь
        await enqueueNotification({
          userId: prescription.responsible.id,
          email: prescription.responsible.email,
          type: 'prescription_deadline',
          title,
          body,
          entityType: 'Prescription',
          entityId: prescription.id,
          entityName: `Предписание № ${prescription.number}`,
        });

        sentCount++;
      } catch (prescriptionErr) {
        // Ошибка одного предписания не прерывает batch
        logger.error(
          { err: prescriptionErr, prescriptionId: prescription.id },
          'Ошибка отправки уведомления о сроке предписания'
        );
      }
    }

    logger.info(
      { total: prescriptions.length, sent: sentCount },
      'Cron prescription-deadline завершён'
    );

    return successResponse({ sent: sentCount });
  } catch (err) {
    logger.error({ err }, 'Cron prescription-deadline: критическая ошибка');
    return errorResponse('Internal server error', 500);
  }
}
