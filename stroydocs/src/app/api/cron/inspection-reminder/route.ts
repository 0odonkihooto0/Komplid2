/**
 * Cron-эндпоинт напоминаний об освидетельствовании записей журналов.
 *
 * По ГОСТ Р 70108-2025: исполнитель обязан уведомить надзорные организации
 * о предстоящем освидетельствовании не менее чем за 3 рабочих дня.
 *
 * Расписание: 0 6 * * 1-5 (09:00 МСК, Пн–Пт)
 * Авторизация: Bearer CRON_SECRET
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { workingDaysBetween } from '@/utils/workingDays';
import { enqueueNotification } from '@/lib/queue';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Аутентификация по Bearer-токену
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;

    if (!secret || token !== secret) {
      return errorResponse('Unauthorized', 401);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Горизонт 7 календарных дней покрывает 3 рабочих дня с учётом выходных
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 7);

    // Записи журналов с приближающимся освидетельствованием
    const entries = await db.specialJournalEntry.findMany({
      where: {
        inspectionDate: { gte: today, lte: horizon },
        inspectionNotificationSent: false,
        journal: { status: 'ACTIVE' },
      },
      include: {
        journal: {
          include: {
            responsible: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            project: { select: { name: true } },
          },
        },
      },
    });

    let sentCount = 0;

    for (const entry of entries) {
      const daysUntil = workingDaysBetween(today, entry.inspectionDate!);

      // Уведомляем только за 1, 2 или 3 рабочих дня
      if (daysUntil < 1 || daysUntil > 3) continue;

      const { journal } = entry;
      const objectName = journal.project.name;
      const dateStr = entry.inspectionDate!.toLocaleDateString('ru-RU');

      const title = `Освидетельствование через ${daysUntil} раб. дн.: запись №${entry.entryNumber}`;
      const body =
        `Объект: ${objectName}. Журнал: «${journal.title}» (${journal.number}). ` +
        `Дата: ${dateStr}. ${entry.description}`;

      try {
        // Уведомление в БД для ответственного за журнал
        await db.notification.create({
          data: {
            userId: journal.responsible.id,
            type: 'inspection_reminder',
            title,
            body,
            entityType: 'SpecialJournalEntry',
            entityId: entry.id,
            entityName: `Запись №${entry.entryNumber}`,
          },
        });

        // Email через BullMQ-очередь
        await enqueueNotification({
          userId: journal.responsible.id,
          email: journal.responsible.email,
          type: 'inspection_reminder',
          title,
          body,
          entityType: 'SpecialJournalEntry',
          entityId: entry.id,
          entityName: `Запись №${entry.entryNumber}`,
        });

        // Помечаем запись как уведомлённую (идемпотентность при повторном запуске)
        await db.specialJournalEntry.update({
          where: { id: entry.id },
          data: { inspectionNotificationSent: true },
        });

        sentCount++;
      } catch (entryErr) {
        // Ошибка одной записи не прерывает batch
        logger.error(
          { err: entryErr, entryId: entry.id },
          'Ошибка отправки уведомления об освидетельствовании'
        );
      }
    }

    logger.info(
      { total: entries.length, sent: sentCount },
      'Cron inspection-reminder завершён'
    );

    return successResponse({ sent: sentCount });
  } catch (err) {
    logger.error({ err }, 'Cron inspection-reminder: критическая ошибка');
    return errorResponse('Internal server error', 500);
  }
}
